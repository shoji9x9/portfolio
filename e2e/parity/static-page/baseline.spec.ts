// 視覚ベースラインの採取とノイズ基準値の測定。
//
// **同一条件で 2 回撮り、その差分量をノイズ基準値とする。** parity-diff は「新側との差分がこれと
// 同程度なら回帰ではない」と判定する。1 回目をベースラインとしてディスクへ残し、2 回目は
// メモリ上でのみ比較する（ワークツリーは最新のみ）。
//
// 実行:
//   PARITY_CURRENT_UI_URL=<url> pnpm exec playwright test --project=current e2e/parity/static-page/baseline.spec.ts
import type { NetworkEntry } from "../lib/capture";

import { mkdir, writeFile } from "node:fs/promises";

import { VIEWPORTS } from "../../../playwright.config";
import { collectArtifacts, writeArtifacts } from "../lib/capture";
import { expect, test } from "../lib/fixtures";
import { comparePng } from "../lib/tools/pixel-compare.mjs";
import { compareTraits } from "../lib/tools/vendor/trait-compare.mjs";

const OUTPUT_DIR = ".replace/parity/static-page/baseline";

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

test.describe("static-page: ベースライン採取とノイズ基準値", () => {
  test("現行を同一条件で 2 回採取し、差分量を記録する", async ({ page, entries }) => {
    test.setTimeout(600_000);

    const noise: NoiseRow[] = [];
    const written: string[] = [];

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // ネットワークログは 1 回目の遷移で採る（3 点セットの補助資料）。
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
      written.push(...(await writeArtifacts(first, network, OUTPUT_DIR)));

      page.removeAllListeners("response");
      await page.reload({ waitUntil: "networkidle" });
      const second = await collectArtifacts(page, entries, { viewport });

      // 既定状態: 画素と特性の両方でノイズ量を測る。
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

      // hover / focus: 代表要素の要素画像と特性でノイズ量を測る。
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

      // 参考 aria は 2 回とも同じであること（揺れるならベースラインとして使えない）。
      expect(second.aria, "参考 aria が 2 回の採取で揺れた").toBe(first.aria);
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(`${OUTPUT_DIR}/noise.json`, `${JSON.stringify(noise, null, 2)}\n`, "utf8");
    await writeFile(`${OUTPUT_DIR}/files.txt`, `${written.toSorted().join("\n")}\n`, "utf8");

    // ノイズが大きすぎると差分器のシグナルが埋もれる。桁が変わったら撮影条件を見直す。
    for (const row of noise) {
      const ratio = row.pixel_total === 0 ? 0 : row.pixel_diff / row.pixel_total;
      expect(ratio, `${row.viewport}/${row.state} のノイズが大きすぎる`).toBeLessThan(0.01);
    }
  });
});
