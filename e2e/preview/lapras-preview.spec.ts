import type { ConsoleMessage } from "@playwright/test";

import { expect, test } from "@playwright/test";

const LAPRAS_API_PATH = "/api/lapras-preview";
const LAPRAS_IMAGE_HOST = "media.lapras.com";
const LAPRAS_PUBLIC_URL = "https://lapras.com/public/shoji9x9";

// Cloudflare Pages は Web Analytics のビーコン（static.cloudflareinsights.com/beacon.min.js）を
// **エッジで注入**する。リポジトリーにも dist にも存在せず、こちらのコードでは止められない。
// ビーコンの送信先 cloudflareinsights.com/cdn-cgi/rum は CORS ヘッダーを返さないため、
// ブラウザーが CORS エラーと net::ERR_FAILED を出し、console クリーンの検証が必ず落ちる。
//
// 除外は**このホストだけ**に限定する。「第三者由来は全部無視」にすると、アプリが読み込む
// 外部リソース（LAPRAS の画像等）の失敗まで見逃すため。ホスト以外のエラーは従来どおり失敗させる。
const IGNORED_CONSOLE_ERROR_HOSTS = ["cloudflareinsights.com"];

/** Cloudflare が注入したビーコン由来の console エラーかどうか。 */
function isInjectedBeaconError(message: ConsoleMessage): boolean {
  // net::ERR_FAILED は本文に URL を含まないため location().url も見る。
  const haystacks = [message.text(), message.location().url];
  return IGNORED_CONSOLE_ERROR_HOSTS.some((host) =>
    haystacks.some((haystack) => haystack.includes(host)),
  );
}

test("実 API から取得した LAPRAS プレビューを表示する", async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (baseURL === undefined || baseURL === "") {
    throw new Error("PREVIEW_UI_URL を指定してください。");
  }

  const consoleErrors: string[] = [];
  let imageResponseStatus: number | undefined;
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (isInjectedBeaconError(message)) return;
    consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (new URL(response.url()).hostname === LAPRAS_IMAGE_HOST) {
      imageResponseStatus = response.status();
    }
  });

  // パリティスイートとは異なり route.fulfill() を使わず、実 Function と外部ページ取得を検証する。
  const apiResponsePromise = page.waitForResponse((response) => {
    return new URL(response.url()).pathname === LAPRAS_API_PATH;
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const apiResponse = await apiResponsePromise;
  expect(apiResponse.status()).toBe(200);
  expect(apiResponse.headers()["content-type"]).toContain("application/json");

  const section = page.getByRole("region", { name: "LAPRAS" });
  const link = section.getByRole("link");
  const image = section.getByRole("img");
  await expect(link).toHaveAttribute("href", LAPRAS_PUBLIC_URL);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute("src", /^https:\/\/media\.lapras\.com\//);
  await expect(image).toHaveAttribute("alt", /\S/);
  await expect(image).toHaveJSProperty("complete", true);
  await expect
    .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
    .toBeGreaterThan(0);

  expect(imageResponseStatus).toBe(200);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(section).toBeVisible();
  await expect(image).toBeVisible();
  await expect(section.getByRole("link", { name: "LAPRAS 公開プロフィール" })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
