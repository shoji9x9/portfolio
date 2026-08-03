import type { NetworkEntry } from "../lib/capture";

import { mkdir, writeFile } from "node:fs/promises";

import { VIEWPORTS } from "../../../playwright.config";
import { assertBaselineBrowser } from "../lib/browser-version";
import { writeDefaultArtifacts, writeNetworkEntries } from "../lib/capture";
import { expect, test } from "../lib/fixtures";
import { comparePng } from "../lib/tools/pixel-compare.mjs";
import { compareTraits } from "../lib/tools/vendor/trait-compare.mjs";
import { collectLaprasDefaultArtifacts } from "./capture";

const OUTPUT_DIR = ".replace/parity/lapras/baseline";
const ALIGN_TOLERANCE = 1;

test("lapras: 現行ベースラインと自己ノイズを採取する", async ({ browser, page, containers }) => {
  test.setTimeout(600_000);

  // 記録済みの採取条件と違うブラウザーで上書きすると、以後の比較が別条件どうしになる。
  await assertBaselineBrowser(browser, "lapras", "current");

  const noise: {
    page: string;
    state: string;
    viewport: string;
    pixel_diff: number;
    pixel_total: number;
    trait_diffs: number;
  }[] = [];
  const written: string[] = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const network: NetworkEntry[] = [];
    const onResponse = (response: import("@playwright/test").Response): void => {
      const request = response.request();
      network.push({
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        status: response.status(),
      });
    };

    page.on("response", onResponse);
    await page.reload({ waitUntil: "networkidle" });
    page.off("response", onResponse);
    const first = await collectLaprasDefaultArtifacts(page, containers, { viewport });
    written.push(...(await writeDefaultArtifacts(first, OUTPUT_DIR)));
    written.push(...(await writeNetworkEntries(network, OUTPUT_DIR, viewport.label)));

    await page.reload({ waitUntil: "networkidle" });
    const second = await collectLaprasDefaultArtifacts(page, containers, { viewport });
    const pixels = comparePng(first.pageScreenshot, second.pageScreenshot);
    noise.push({
      page: "/",
      state: "default",
      viewport: viewport.label,
      pixel_diff: pixels.diffPixels,
      pixel_total: pixels.totalPixels,
      trait_diffs: compareTraits(first.traits, second.traits, {
        alignTolerance: ALIGN_TOLERANCE,
      }).length,
    });
    expect(second.aria, "参考 aria が 2 回の採取で揺れた").toBe(first.aria);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/noise.json`, `${JSON.stringify(noise, null, 2)}\n`, "utf8");
  await writeFile(`${OUTPUT_DIR}/files.txt`, `${written.toSorted().join("\n")}\n`, "utf8");

  for (const row of noise) {
    const ratio = row.pixel_total === 0 ? 0 : row.pixel_diff / row.pixel_total;
    expect(ratio, `${row.viewport} の自己ノイズが大きすぎる`).toBeLessThan(0.01);
  }
});
