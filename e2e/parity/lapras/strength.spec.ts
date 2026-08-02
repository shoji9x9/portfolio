import type { LogicalEntry } from "../lib/locator-map/portable";
import type { Locator } from "@playwright/test";

import { readFile, writeFile } from "node:fs/promises";

import { parseTraits } from "../lib/capture";
import { expect, test } from "../lib/fixtures";
import { OBSERVED_LAPRAS_PREVIEW } from "../lib/lapras-fixture";
import { laprasEntries } from "../lib/locator-map/portable";
import { compareAria } from "../lib/tools/aria-compare.mjs";
import { comparePng } from "../lib/tools/pixel-compare.mjs";
import { captureTraits } from "../lib/tools/vendor/trait-capture.mjs";
import { compareTraits } from "../lib/tools/vendor/trait-compare.mjs";
import { laprasAria, laprasScreenshot } from "./capture";

const BASELINE = ".replace/parity/lapras/baseline/desktop/default";
const RESULT_PATH = ".replace/parity/lapras/strength-results.json";

type Detection = "handwritten" | "traits" | "pixel" | "aria";
type FaultResult = {
  id: string;
  fault_class: string;
  injection: string;
  detected_by: Detection[];
};
const results: FaultResult[] = [];

async function handwritten(section: Locator): Promise<boolean> {
  try {
    const link = section.getByRole("link", {
      name: OBSERVED_LAPRAS_PREVIEW.title,
      exact: true,
    });
    await expect(link).toHaveAttribute("href", OBSERVED_LAPRAS_PREVIEW.url);
    await expect(
      section.getByRole("img", { name: OBSERVED_LAPRAS_PREVIEW.title, exact: true }),
    ).toHaveAttribute("src", OBSERVED_LAPRAS_PREVIEW.image);
    return false;
  } catch {
    return true;
  }
}

async function detect(section: Locator, entries: readonly LogicalEntry[]): Promise<Detection[]> {
  const detected: Detection[] = [];
  if (await handwritten(section)) detected.push("handwritten");

  try {
    const baselineTraits = parseTraits(
      await readFile(`${BASELINE}/traits.json`, "utf8"),
      `${BASELINE}/traits.json`,
    );
    const currentTraits = await captureTraits([...entries]);
    if (compareTraits(baselineTraits, currentTraits, { alignTolerance: 1 }).length > 0) {
      detected.push("traits");
    }
  } catch {
    detected.push("traits");
  }

  const screenshot = await laprasScreenshot(section);
  if (comparePng(await readFile(`${BASELINE}/screenshot.png`), screenshot).diffPixels > 0) {
    detected.push("pixel");
  }

  const aria = await laprasAria(section);
  if (compareAria(await readFile(`${BASELINE}/aria.txt`, "utf8"), aria).length > 0) {
    detected.push("aria");
  }
  return detected;
}

async function runFault(
  section: Locator,
  entries: readonly LogicalEntry[],
  fault: Omit<FaultResult, "detected_by">,
): Promise<Detection[]> {
  const detectedBy = await detect(section, entries);
  results.push({ ...fault, detected_by: detectedBy });
  return detectedBy;
}

test.describe.configure({ mode: "serial" });

test.describe("lapras: 強度ゲート", () => {
  test.afterAll(async () => {
    await writeFile(RESULT_PATH, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  });

  test("ポジティブコントロール", async ({ containers }) => {
    const detected = await runFault(containers.section("lapras"), laprasEntries(containers), {
      id: "control",
      fault_class: "対照",
      injection: "なし",
    });
    expect(detected).toEqual([]);
  });

  test("F1: 公開プロフィールのリンク先を改変する", async ({ containers }) => {
    const section = containers.section("lapras");
    await section.getByRole("link").evaluate((element) => {
      element.setAttribute("href", "https://example.com/");
    });
    const detected = await runFault(section, laprasEntries(containers), {
      id: "F1-link",
      fault_class: "リンク先",
      injection: "DOM 摂動: href を別 URL へ変更",
    });
    expect(detected).toContain("handwritten");
  });

  test("F2: プレビュー画像の代替テキストを改変する", async ({ containers }) => {
    const section = containers.section("lapras");
    await section.getByRole("img").evaluate((element) => {
      element.setAttribute("alt", "LAPRAS");
    });
    const detected = await runFault(section, laprasEntries(containers), {
      id: "F2-aria",
      fault_class: "構造（aria）",
      injection: "DOM 摂動: img alt を変更",
    });
    expect(detected.some((path) => path === "handwritten" || path === "aria")).toBe(true);
  });

  test("F3: プレビュー画像を透明にする", async ({ containers }) => {
    const section = containers.section("lapras");
    await section.getByRole("img").evaluate((element: HTMLElement) => {
      element.style.opacity = "0";
    });
    const detected = await runFault(section, laprasEntries(containers), {
      id: "F3-visual",
      fault_class: "要素スタイル",
      injection: "スタイル摂動: opacity を 0 に変更",
    });
    expect(detected.some((path) => path === "traits" || path === "pixel")).toBe(true);
  });
});
