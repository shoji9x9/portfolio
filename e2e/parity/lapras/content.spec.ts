import { dataset } from "../lib/dataset";
import { expect, test } from "../lib/fixtures";
import { OBSERVED_LAPRAS_PREVIEW } from "../lib/lapras-fixture";

test.describe("lapras: 表示パリティ", () => {
  test("見出し・公開プロフィールリンク・プレビュー画像を表示する", async ({ containers }) => {
    const section = containers.section("lapras");
    await expect(
      section.getByRole("heading", { level: 2, name: "LAPRAS", exact: true }),
    ).toBeVisible();

    const link = section.getByRole("link", {
      name: OBSERVED_LAPRAS_PREVIEW.title,
      exact: true,
    });
    await expect(link).toHaveAttribute("href", dataset.lapras.publicUrl);
    await expect(link).toHaveAttribute("target", "_blank");

    const image = section.getByRole("img", {
      name: OBSERVED_LAPRAS_PREVIEW.title,
      exact: true,
    });
    await expect(image).toHaveAttribute("src", OBSERVED_LAPRAS_PREVIEW.image);
    await expect(image).toHaveJSProperty("complete", true);
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBe(1200);
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalHeight))
      .toBe(630);
  });
});
