import type { NetworkEntry } from "../lib/capture";

// 新側ベースラインの採取と自己ノイズ測定（parity-diff の入力）。
//
// **撮るのは新側だけ。** 現行のベースラインは parity-suite が採ったものを使い、現行アプリは駆動しない。
// 現側 `baseline/` と対称のレイアウトで `new/<target>/baseline-new/` へ書き出す。
//
// 実行:
//   PARITY_NEW_UI_URL=<url> PARITY_NEW_TARGET=<target> \
//     pnpm exec playwright test --project=new e2e/parity/static-page/baseline-new.spec.ts
import { mkdir, writeFile } from "node:fs/promises";

import { VIEWPORTS } from "../../../playwright.config";
import { collectArtifacts, writeArtifacts } from "../lib/capture";
import { expect, test } from "../lib/fixtures";
import { comparePng } from "../lib/tools/pixel-compare.mjs";
import { compareTraits } from "../lib/tools/vendor/trait-compare.mjs";

/** `metadata.json` の differ.align_tolerance と一致させる（記録値と実行値をずらさない）。 */
const ALIGN_TOLERANCE = 1;

type NoiseRow = {
  page: string;
  state: string;
  viewport: string;
  pixel_diff: number;
  pixel_total: number;
  trait_diffs: number;
};

test.describe("static-page: 新側ベースライン採取と自己ノイズ測定", () => {
  test("新側を同一条件で 2 回採取し、差分量を記録する", async ({ page, entries }) => {
    test.setTimeout(600_000);

    const target = process.env["PARITY_NEW_TARGET"];
    if (target === undefined || target === "") {
      throw new Error("PARITY_NEW_TARGET が未設定です（成果物は環境別に分かれるため必須）。");
    }
    const outputDir = `.replace/parity/static-page/new/${target}/baseline-new`;

    const noise: NoiseRow[] = [];
    const written: string[] = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const network: NetworkEntry[] = [];
      page.on("response", (response) => {
        const request = response.request();
        network.push({
          method: request.method(),
          url: request.url(),
          resourceType: request.resourceType(),
          status: response.status(),
        });
      });
      await page.reload({ waitUntil: "networkidle" });

      const first = await collectArtifacts(page, entries, { viewport });
      written.push(...(await writeArtifacts(first, network, outputDir)));

      page.removeAllListeners("response");
      await page.reload({ waitUntil: "networkidle" });
      const second = await collectArtifacts(page, entries, { viewport });

      const pagePixel = comparePng(first.pageScreenshot, second.pageScreenshot);
      noise.push({
        page: "/",
        state: "default",
        viewport: viewport.label,
        pixel_diff: pagePixel.diffPixels,
        pixel_total: pagePixel.totalPixels,
        trait_diffs: compareTraits(first.traits, second.traits, {
          alignTolerance: ALIGN_TOLERANCE,
        }).length,
      });

      for (const state of ["hover", "focus"] as const) {
        let pixelDiff = 0;
        let pixelTotal = 0;
        for (const [name, buffer] of first[state].screenshots) {
          const other = second[state].screenshots.get(name);
          expect(other, `2 回目に ${state} の ${name} が採れていない`).toBeDefined();
          if (other === undefined) continue;
          const result = comparePng(buffer, other);
          pixelDiff += result.diffPixels;
          pixelTotal += result.totalPixels;
        }
        noise.push({
          page: "/",
          state,
          viewport: viewport.label,
          pixel_diff: pixelDiff,
          pixel_total: pixelTotal,
          trait_diffs: compareTraits(first[state].traits, second[state].traits, {
            alignTolerance: ALIGN_TOLERANCE,
          }).length,
        });
      }

      expect(second.aria, "新側の参考 aria が 2 回の採取で揺れた").toBe(first.aria);
    }

    await mkdir(outputDir, { recursive: true });
    await writeFile(`${outputDir}/noise.json`, `${JSON.stringify(noise, null, 2)}\n`, "utf8");
    await writeFile(`${outputDir}/files.txt`, `${written.toSorted().join("\n")}\n`, "utf8");
  });
});
