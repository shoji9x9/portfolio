import { dataset } from "../lib/dataset";
import { expect, test } from "../lib/fixtures";
import { LAPRAS_API_PATTERN, OBSERVED_LAPRAS_PREVIEW } from "../lib/lapras-fixture";

test.describe("lapras: 操作・状態", () => {
  test("画像リンクへキーボードで到達できる", async ({ containers }) => {
    const link = containers.section("lapras").getByRole("link", {
      name: OBSERVED_LAPRAS_PREVIEW.title,
      exact: true,
    });
    await link.focus();
    await expect(link).toBeFocused();
  });

  test("API 失敗時は画像を隠し、公開プロフィールのテキストリンクを残す", async ({
    page,
    containers,
  }, testInfo) => {
    test.skip(testInfo.project.name === "current", "現行に存在しない承認済みフォールバック");

    await page.unroute(LAPRAS_API_PATTERN);
    await page.route(LAPRAS_API_PATTERN, async (route) => {
      await route.fulfill({
        json: { error: "lapras_preview_unavailable" },
        status: 503,
      });
    });
    await page.reload({ waitUntil: "networkidle" });

    const section = containers.section("lapras");
    const fallback = section.getByRole("link", {
      name: "LAPRAS 公開プロフィール",
      exact: true,
    });
    await expect(fallback).toHaveAttribute("href", dataset.lapras.publicUrl);
    await expect(section.getByRole("img")).toHaveCount(0);
  });
});
