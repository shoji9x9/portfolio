import type { CaptureConditions, DefaultArtifacts } from "../lib/capture";
import type { ContainerLocators } from "../lib/locator-map/types";
import type { Locator, Page } from "@playwright/test";

import { PNG } from "pngjs";

import { enterState } from "../lib/interactions";
import { laprasEntries } from "../lib/locator-map/portable";
import { captureTraits } from "../lib/tools/vendor/trait-capture.mjs";

/** LAPRAS 機能の手書き assertion と同じ境界で、見出しと画像リンクの ARIA だけを採る。 */
export async function laprasAria(section: Locator): Promise<string> {
  const heading = await section
    .getByRole("heading", { level: 2, name: "LAPRAS", exact: true })
    .ariaSnapshot();
  const link = await section.getByRole("link").ariaSnapshot();
  return `${heading}\n${link}`;
}

function stackScreenshots(topBuffer: Buffer, bottomBuffer: Buffer): Buffer {
  const top = PNG.sync.read(topBuffer);
  const bottom = PNG.sync.read(bottomBuffer);
  const output = new PNG({
    width: Math.max(top.width, bottom.width),
    height: top.height + bottom.height,
  });
  for (const [source, offsetY] of [
    [top, 0],
    [bottom, top.height],
  ] as const) {
    for (let row = 0; row < source.height; row += 1) {
      const sourceStart = row * source.width * 4;
      const targetStart = (offsetY + row) * output.width * 4;
      source.data.copy(output.data, targetStart, sourceStart, sourceStart + source.width * 4);
    }
  }
  return PNG.sync.write(output);
}

/**
 * セクション本体と画像全体を別々に撮影して縦に連結する。
 * mobile の固定幅画像はセクション枠からはみ出すため、section screenshot だけでは右側が欠落する。
 */
export async function laprasScreenshot(section: Locator): Promise<Buffer> {
  const image = section.getByRole("img");
  const screenshotOptions = { animations: "disabled" as const, caret: "hide" as const };
  const sectionScreenshot = await section.screenshot(screenshotOptions);
  const imageScreenshot = await image.screenshot(screenshotOptions);
  return stackScreenshots(sectionScreenshot, imageScreenshot);
}

export async function collectLaprasDefaultArtifacts(
  page: Page,
  containers: ContainerLocators,
  conditions: CaptureConditions,
): Promise<DefaultArtifacts> {
  await enterState(page, page.locator("body"), "default");
  const section = containers.section("lapras");
  const pageScreenshot = await laprasScreenshot(section);
  const traits = await captureTraits(laprasEntries(containers));
  return {
    conditions,
    pageScreenshot,
    traits,
    aria: await laprasAria(section),
  };
}
