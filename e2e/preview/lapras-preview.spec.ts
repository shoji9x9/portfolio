import { expect, test } from "@playwright/test";

const LAPRAS_API_PATH = "/api/lapras-preview";
const LAPRAS_IMAGE_HOST = "media.lapras.com";
const LAPRAS_PUBLIC_URL = "https://lapras.com/public/shoji9x9";

test("実 API から取得した LAPRAS プレビューを表示する", async ({ page }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  if (baseURL === undefined || baseURL === "") {
    throw new Error("PREVIEW_UI_URL を指定してください。");
  }

  const consoleErrors: string[] = [];
  let imageResponseStatus: number | undefined;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
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
