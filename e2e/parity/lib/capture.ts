// 視覚ベースラインの採取（3 点セット＋ネットワークログ）。
//
// **現行アプリを駆動するのは parity-suite だけ**なので、スイートを走らせるついでにここで採る。
// parity-diff は新側に対して同じ関数を同じ撮影条件で呼び、採取物どうしを決定論的ツールで照合する。
//
// 3 点セット:
//   1. スクリーンショット（画素）— 名前の付かない要素の見た目差を拾う
//   2. 論理名付き要素の特性（computed style ＋ 擬似要素 ＋ 相対幾何の素になる rect）
//   3. 参考 aria スナップショット — **参考資料であって assertion ではない**（assertion は手書き）
//
// 採取（`collectArtifacts`）と永続化（`writeArtifacts`）を分けているのは、ノイズ基準値の測定で
// 同一条件の 2 回目をディスクに残さず（＝ワークツリーは最新のみ）比較できるようにするため。
import type { LogicalEntry } from "./locator-map/portable";
import type { Locator, Page } from "@playwright/test";

import { mkdir, writeFile } from "node:fs/promises";

import { enterState } from "./interactions";
import { captureTraits } from "./tools/vendor/trait-capture.mjs";

/** 撮影条件（`metadata.json` の capture_conditions と対応。parity-diff が同一条件で撮るための正本）。 */
export type CaptureConditions = {
  viewport: { label: string; width: number; height: number };
};

/** 採取した特性 1 件（`trait-capture.mjs` の返り値と同形）。 */
export type Trait = {
  name: string;
  computed: Record<string, string>;
  before: Record<string, string> | null;
  after: Record<string, string> | null;
  rect: { x: number; y: number; width: number; height: number };
};

/** ネットワークログの 1 件。認証情報・トークンは記録しない（本ページに該当値は無いが規律として通す）。 */
export type NetworkEntry = { method: string; url: string; resourceType: string; status: number };

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  for (const key of Object.keys(value)) {
    const entry: unknown = Reflect.get(value, key);
    if (typeof entry !== "string") return false;
  }
  return true;
}

function isRect(value: unknown): value is Trait["rect"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    typeof value.x === "number" &&
    "y" in value &&
    typeof value.y === "number" &&
    "width" in value &&
    typeof value.width === "number" &&
    "height" in value &&
    typeof value.height === "number"
  );
}

function isTrait(value: unknown): value is Trait {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    "computed" in value &&
    isStringRecord(value.computed) &&
    "rect" in value &&
    isRect(value.rect) &&
    "before" in value &&
    (value.before === null || isStringRecord(value.before)) &&
    "after" in value &&
    (value.after === null || isStringRecord(value.after))
  );
}

/**
 * 保存済みの特性ベースラインを読み戻して型を確定させる。
 * 強度ゲートと parity-diff の双方が「ベースライン相手の照合」で使う。
 */
export function parseTraits(json: string, source: string): Trait[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error(`特性ベースラインが配列ではありません: ${source}`);
  }
  const entries: unknown[] = parsed;
  return entries.map((entry, index) => {
    if (!isTrait(entry)) {
      throw new Error(`特性ベースラインの ${index} 番目の形が想定と異なります: ${source}`);
    }
    return entry;
  });
}

type StateArtifacts = {
  /** 論理名 → 要素スクリーンショット。 */
  screenshots: Map<string, Buffer>;
  traits: Trait[];
};

export type ViewportArtifacts = {
  conditions: CaptureConditions;
  pageScreenshot: Buffer;
  traits: Trait[];
  aria: string;
  hover: StateArtifacts;
  focus: StateArtifacts;
};

/**
 * スクリーンショットでマスクする動的領域。
 *   - AtCoder バッジ: レーティングに応じて画像の内容・幅が変わる外部生成画像
 *   - LAPRAS セクション: 機能 `lapras`（Issue #23）の担当範囲で、外部プレビュー画像は差し替わりうる
 * 認証情報・個人情報はページ上に存在しないため、その観点のマスクは不要。
 */
export function dynamicMasks(page: Page): Locator[] {
  return [
    page.getByRole("img", { name: "AtCoder", exact: true }),
    page
      .getByRole("main")
      .locator("> div")
      .filter({ has: page.getByRole("heading", { level: 2, name: "LAPRAS", exact: true }) }),
  ];
}

/** hover / focus を採る代表要素（論理名）。スタイル系統ごとに 1 つ選ぶ。 */
const INTERACTIVE_SAMPLES: readonly string[] = [
  "desired-work.link",
  "artifacts.card.portfolio.url-link",
  "account.link.github",
];

function findEntry(entries: readonly LogicalEntry[], name: string): LogicalEntry {
  const found = entries.find((entry) => entry.name === name);
  if (found === undefined) {
    throw new Error(`論理名 "${name}" がロケータカタログにありません`);
  }
  return found;
}

async function collectState(
  page: Page,
  entries: readonly LogicalEntry[],
  state: "hover" | "focus",
): Promise<StateArtifacts> {
  const screenshots = new Map<string, Buffer>();
  const traits: Trait[] = [];
  for (const name of INTERACTIVE_SAMPLES) {
    const entry = findEntry(entries, name);
    await enterState(page, entry.locator, state);
    const [captured] = await captureTraits([entry]);
    if (captured === undefined) {
      throw new Error(`状態 ${state} の特性採取に失敗しました: ${name}`);
    }
    traits.push(captured);
    screenshots.set(
      name,
      await entry.locator.screenshot({ animations: "disabled", caret: "hide" }),
    );
  }
  await enterState(page, page.locator("body"), "default");
  return { screenshots, traits };
}

/**
 * 1 ビューポート分の 3 点セットをメモリ上に採取する。
 * 呼び出し前にページを開き、ビューポートを設定済みであること。
 */
export async function collectArtifacts(
  page: Page,
  entries: readonly LogicalEntry[],
  conditions: CaptureConditions,
): Promise<ViewportArtifacts> {
  await enterState(page, page.locator("body"), "default");

  const pageScreenshot = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    mask: dynamicMasks(page),
  });
  const traits = await captureTraits(entries.map(({ name, locator }) => ({ name, locator })));
  // 参考 aria（assertion ではない）。強度ゲートの aria 比較経路がこれを相手に構造比較する。
  const aria = await page.getByRole("main").ariaSnapshot();

  const hover = await collectState(page, entries, "hover");
  const focus = await collectState(page, entries, "focus");

  return { conditions, pageScreenshot, traits, aria, hover, focus };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

/** 採取物を `outputDir/<viewport>/…` へ書き出し、書いた相対パスを返す。 */
export async function writeArtifacts(
  artifacts: ViewportArtifacts,
  network: readonly NetworkEntry[],
  outputDir: string,
): Promise<string[]> {
  const label = artifacts.conditions.viewport.label;
  const base = `${outputDir}/${label}`;
  const written: string[] = [];

  await mkdir(`${base}/default`, { recursive: true });
  await writeFile(`${base}/default/screenshot.png`, artifacts.pageScreenshot);
  written.push(`${label}/default/screenshot.png`);
  await writeJson(`${base}/default/traits.json`, artifacts.traits);
  written.push(`${label}/default/traits.json`);
  await writeFile(`${base}/default/aria.txt`, `${artifacts.aria}\n`, "utf8");
  written.push(`${label}/default/aria.txt`);

  for (const [state, stateArtifacts] of [
    ["hover", artifacts.hover],
    ["focus", artifacts.focus],
  ] as const) {
    await mkdir(`${base}/${state}`, { recursive: true });
    await writeJson(`${base}/${state}/traits.json`, stateArtifacts.traits);
    written.push(`${label}/${state}/traits.json`);
    for (const [name, buffer] of stateArtifacts.screenshots) {
      await writeFile(`${base}/${state}/${name}.png`, buffer);
      written.push(`${label}/${state}/${name}.png`);
    }
  }

  await writeJson(`${base}/network.json`, network);
  written.push(`${label}/network.json`);
  return written;
}
