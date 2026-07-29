// 強度ゲート（故障注入＝ネガティブコントロール）。
//
// **この工程が抜けると下流が全部無意味になる。** assertion が弱められた／そもそも無いテストも
// pass するため、テストがあること自体は品質の証拠にならない。
//
// 判定単位は「現行検出一式」= 手書き assertion ＋ ベースライン ＋ 差分器（特性照合・画素・aria 比較）。
// 故障を注入して**どれも赤くならなければ**、その故障種別に対して一式は弱い。
//
// 故障カタログは恣意的に作らず、既知の回帰分類から導出している:
//   - 設定の `intentional_diffs.keep`（セクション順・内容・外部リンク先・読み取り専用の振る舞い）
//   - コンポーネントライブラリ差（Tailwind v3 → v4、Next.js → Vite/React）
//   - 本スキルの調査で実際に見つかった移行ハザード（GitHub 表記のゆれ＝データセット version 2）
//
// 上流摂動について: 現行は API を持たない静的サイトで、**データの上流 = document 応答そのもの**。
// document 応答の書き換えと外部画像 GET の遮断を上流摂動として使い、静的マークアップの
// 文言・構造は DOM 摂動（第二経路）で注入する。
//
// 実行:
//   PARITY_CURRENT_UI_URL=<url> pnpm exec playwright test --project=current e2e/parity/static-page/strength.spec.ts
import type { LogicalEntry } from "../lib/locator-map/portable";
import type { ContainerLocators } from "../lib/locator-map/types";
import type { Page } from "@playwright/test";

import { readFile, writeFile } from "node:fs/promises";

import { dynamicMasks, parseTraits } from "../lib/capture";
import * as checks from "../lib/checks";
import { expect, test } from "../lib/fixtures";
import { compareAria } from "../lib/tools/aria-compare.mjs";
import { comparePng } from "../lib/tools/pixel-compare.mjs";
import { captureTraits } from "../lib/tools/vendor/trait-capture.mjs";
import { compareTraits } from "../lib/tools/vendor/trait-compare.mjs";

const BASELINE_DIR = ".replace/parity/static-page/baseline/desktop/default";
const RESULT_PATH = ".replace/parity/static-page/strength-results.json";
const ALIGN_TOLERANCE = 1;

/** 検出経路。手書き assertion と差分器 3 経路の 4 つ。 */
type DetectionPath = "handwritten" | "traits" | "pixel" | "aria";

type FaultResult = {
  id: string;
  fault_class: string;
  injection: string;
  detected_by: DetectionPath[];
};

const results: FaultResult[] = [];

/** 差分器 3 経路をベースライン相手に回し、赤くなった経路を返す。 */
async function runDiffers(page: Page, entries: readonly LogicalEntry[]): Promise<DetectionPath[]> {
  const red: DetectionPath[] = [];

  const baselineTraits = parseTraits(
    await readFile(`${BASELINE_DIR}/traits.json`, "utf8"),
    `${BASELINE_DIR}/traits.json`,
  );
  try {
    const currentTraits = await captureTraits(
      entries.map(({ name, locator }) => ({ name, locator })),
    );
    if (
      compareTraits(baselineTraits, currentTraits, { alignTolerance: ALIGN_TOLERANCE }).length > 0
    ) {
      red.push("traits");
    }
  } catch {
    // 論理名が解決しなくなること自体が差分（trait-compare の missing に相当）。
    // ツールは失敗箇所を特定できるよう例外で報告する契約なので、ここで差分として扱う。
    red.push("traits");
  }

  const baselinePng = await readFile(`${BASELINE_DIR}/screenshot.png`);
  const currentPng = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    caret: "hide",
    mask: dynamicMasks(page),
  });
  if (comparePng(baselinePng, currentPng).diffPixels > 0) red.push("pixel");

  const baselineAria = await readFile(`${BASELINE_DIR}/aria.txt`, "utf8");
  const currentAria = await page.getByRole("main").ariaSnapshot();
  if (compareAria(baselineAria, currentAria).length > 0) red.push("aria");

  return red;
}

/** 手書き assertion（スイート本体と同一の関数）を回し、1 つでも落ちれば赤とする。 */
async function runHandwritten(
  page: Page,
  containers: ContainerLocators,
): Promise<DetectionPath | null> {
  const suite: (() => Promise<void>)[] = [
    () => checks.checkPageBasicsAndSectionOrder(page, containers),
    () => checks.checkProfileTable(containers),
    () => checks.checkAccountBadges(containers),
    () => checks.checkSelfPromotion(containers),
    () => checks.checkSkillBadges(containers),
    () => checks.checkCareerOrder(containers),
    () => checks.checkCareerProject(containers, "freelance-construction"),
    () => checks.checkArtifactOrder(containers),
    () => checks.checkArtifactCard(containers, "qiita-search"),
    () => checks.checkQualifications(containers),
    () => checks.checkDesiredWork(containers),
    () => checks.checkExternalImagesRendered(containers),
    () => checks.checkFontStackFallsThroughForCjk(page),
    () => checks.checkFavicon(page),
    () => checks.checkAriaProfile(containers),
    () => checks.checkAriaAccount(containers),
    () => checks.checkAriaSelfPromotion(containers),
    () => checks.checkAriaSkills(containers),
    () => checks.checkAriaCareers(containers),
    () => checks.checkAriaCareerCard(containers),
    () => checks.checkAriaQualifications(containers),
    () => checks.checkAriaArtifactCard(containers),
    () => checks.checkAriaDesiredWork(containers),
    () => checks.checkBodyLinkHoverChangesColor(page, containers),
    () => checks.checkBadgeLinkHoverUnchanged(page, containers),
    () => checks.checkColorSchemeSwitch(page),
  ];
  for (const check of suite) {
    try {
      await check();
    } catch {
      return "handwritten";
    }
  }
  return null;
}

/** 注入後に一式を回し、赤くなった経路を記録する。 */
async function detect(
  page: Page,
  containers: ContainerLocators,
  entries: readonly LogicalEntry[],
  fault: Omit<FaultResult, "detected_by">,
): Promise<DetectionPath[]> {
  // 差分器は既定状態を前提にしているため、手書き側より先に回す（hover / focus の副作用を避ける）。
  const differPaths = await runDiffers(page, entries);
  const handwritten = await runHandwritten(page, containers);
  const detectedBy = [...(handwritten === null ? [] : [handwritten]), ...differPaths];
  results.push({ ...fault, detected_by: detectedBy });
  return detectedBy;
}

test.describe.configure({ mode: "serial" });

test.describe("static-page: 強度ゲート（故障注入）", () => {
  test("ポジティブコントロール: 無注入なら 4 経路すべて緑", async ({
    page,
    containers,
    entries,
  }) => {
    test.setTimeout(300_000);
    const detected = await detect(page, containers, entries, {
      id: "control-no-injection",
      fault_class: "（対照）注入なし",
      injection: "なし",
    });
    expect(detected, "無注入なのに赤くなった経路がある（偽陽性）").toEqual([]);
  });

  test("F1 値（データ由来）: 上流の document 応答でプロフィールの値を改変", async ({
    page,
    containers,
    entries,
    baseURL,
  }) => {
    test.setTimeout(300_000);
    await page.route(
      (url) => url.href === baseURL || url.href === `${baseURL ?? ""}index.html`,
      async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll("愛知県", "東京都");
        await route.fulfill({ response, body });
      },
    );
    await page.reload({ waitUntil: "networkidle" });

    const detected = await detect(page, containers, entries, {
      id: "F1-value-upstream",
      fault_class: "値・件数・並び（データ由来）",
      injection: "上流摂動: document 応答の文字列置換（愛知県 → 東京都）",
    });
    expect(detected, "値の改変を検出できない").toContain("handwritten");
  });

  test("F2 並び: アカウントバッジの順序を入れ替える", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("account")
      .locator("> div")
      .evaluate((container: HTMLElement) => {
        const links = [...container.querySelectorAll("a")];
        const first = links[0];
        const second = links[1];
        if (first === undefined || second === undefined) throw new Error("リンクが 2 つ未満");
        container.insertBefore(second, first);
      });

    const detected = await detect(page, containers, entries, {
      id: "F2-order-dom",
      fault_class: "値・件数・並び（データ由来）",
      injection: "DOM 摂動: アカウントバッジの 1 番目と 2 番目を入れ替え",
    });
    expect(detected, "表示順の入れ替えを検出できない").toContain("handwritten");
  });

  test("F3 件数: 自己 PR の項目を 1 つ削除", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("self-promotion")
      .getByRole("listitem")
      .last()
      .evaluate((element: HTMLElement) => element.remove());

    const detected = await detect(page, containers, entries, {
      id: "F3-count-dom",
      fault_class: "値・件数・並び（データ由来）",
      injection: "DOM 摂動: 自己 PR の最終項目を削除",
    });
    expect(detected, "件数の減少を検出できない").toContain("handwritten");
  });

  test("F4 リンク先: 希望条件の href を差し替える", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("desired-work")
      .getByRole("link")
      .evaluate((element: HTMLElement) => element.setAttribute("href", "https://example.com/"));

    const detected = await detect(page, containers, entries, {
      id: "F4-href-dom",
      fault_class: "静的ラベル・placeholder・role",
      injection: "DOM 摂動: 希望条件リンクの href を別 URL へ",
    });
    expect(detected, "リンク先の取り違えを検出できない").toContain("handwritten");
  });

  test("F5 構造: 資格の入れ子リストを平坦化", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("qualifications")
      .getByRole("list")
      .first()
      .evaluate((root: HTMLElement) => {
        for (const nested of root.querySelectorAll("ul")) {
          const parent = nested.parentElement;
          if (parent === null) continue;
          while (nested.firstChild !== null) parent.appendChild(nested.firstChild);
          nested.remove();
        }
      });

    const detected = await detect(page, containers, entries, {
      id: "F5-structure-dom",
      fault_class: "構造（aria）",
      injection: "DOM 摂動: 資格の入れ子リストを平坦化",
    });
    expect(detected, "構造の平坦化を検出できない").toContain("handwritten");
    expect(detected, "aria 比較が構造変化を拾えない").toContain("aria");
  });

  test("F6 静的ラベル: 小見出しの文言を改変", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .careerProjectCard("freelance-construction")
      .getByRole("heading", { level: 5, name: "期間", exact: true })
      .evaluate((element: HTMLElement) => {
        element.textContent = "機関";
      });

    const detected = await detect(page, containers, entries, {
      id: "F6-label-dom",
      fault_class: "静的ラベル・placeholder・role",
      injection: "DOM 摂動: 小見出し「期間」→「機関」",
    });
    expect(detected, "静的ラベルの改変を検出できない").toContain("handwritten");
  });

  test("F7 role 欠落: バッジ画像の alt を削除", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("skills")
      .getByRole("img", { name: "TypeScript", exact: true })
      .evaluate((element: HTMLElement) => element.removeAttribute("alt"));

    const detected = await detect(page, containers, entries, {
      id: "F7-accname-dom",
      fault_class: "構造（aria）",
      injection: "DOM 摂動: 保有スキルの TypeScript バッジから alt を削除",
    });
    expect(detected, "アクセシブルネームの欠落を検出できない").toContain("handwritten");
  });

  test("F8 見出しレベル: h2 を h3 へ差し替える", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await containers
      .section("account")
      .getByRole("heading", { level: 2, name: "アカウント", exact: true })
      .evaluate((element: HTMLElement) => {
        const replacement = element.ownerDocument.createElement("h3");
        replacement.className = element.className;
        replacement.textContent = element.textContent;
        element.replaceWith(replacement);
      });

    const detected = await detect(page, containers, entries, {
      id: "F8-heading-level-dom",
      fault_class: "構造（aria）",
      injection: "DOM 摂動: 「アカウント」見出しを h2 → h3",
    });
    expect(detected, "見出しレベルの変化を検出できない").toContain("handwritten");
    expect(detected, "aria 比較が見出しレベルを拾えない").toContain("aria");
  });

  test("F9 スタイル（色）: 本文リンクの色を変える", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await page.addStyleTag({
      content: "a.text-blue-500 { color: rgb(200, 0, 0) !important; }",
    });

    const detected = await detect(page, containers, entries, {
      id: "F9-style-color",
      fault_class: "要素スタイル（色・余白・フォント・罫線）",
      injection: "スタイル注入: 本文リンクの color を赤へ",
    });
    expect(detected, "特性照合が色の変化を拾えない").toContain("traits");
    expect(detected, "画素経路が色の変化を拾えない").toContain("pixel");
  });

  test("F10 スタイル（余白）: カードの padding を変える", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await page.addStyleTag({ content: ".border-2.rounded-lg { padding: 2rem !important; }" });

    const detected = await detect(page, containers, entries, {
      id: "F10-style-padding",
      fault_class: "要素スタイル（色・余白・フォント・罫線）",
      injection: "スタイル注入: カードの padding を 1rem → 2rem",
    });
    expect(detected, "特性照合が余白の変化を拾えない").toContain("traits");
    expect(detected, "画素経路が余白の変化を拾えない").toContain("pixel");
  });

  test("F11 幾何: カード幅を変えて相対関係を崩す", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await page.addStyleTag({ content: ".border-2.rounded-lg { width: 20rem !important; }" });

    const detected = await detect(page, containers, entries, {
      id: "F11-geometry",
      fault_class: "要素スタイル（色・余白・フォント・罫線）",
      injection: "スタイル注入: カード幅を 48rem → 20rem（要素対の相対関係が変わる）",
    });
    expect(detected, "特性照合の相対幾何が崩れを拾えない").toContain("traits");
  });

  test("F12 副作用出力: 外部バッジ画像の GET を失敗させる", async ({
    page,
    containers,
    entries,
  }) => {
    test.setTimeout(300_000);
    await page.route("https://img.shields.io/**", (route) => route.abort());
    await page.reload({ waitUntil: "domcontentloaded" });

    const detected = await detect(page, containers, entries, {
      id: "F12-external-image",
      fault_class: "副作用出力（外部画像 GET）",
      injection: "上流摂動: img.shields.io へのリクエストを abort",
    });
    expect(detected, "外部画像の取得失敗を検出できない").toContain("handwritten");
  });

  test("F13 状態: hover 装飾を無効化する", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await page.addStyleTag({
      content: "a.hover\\:text-blue-700:hover { color: rgb(59, 130, 246) !important; }",
    });

    const detected = await detect(page, containers, entries, {
      id: "F13-hover-lost",
      fault_class: "要素スタイル（状態）",
      injection: "スタイル注入: 本文リンクの hover 色を既定色と同じにする",
    });
    expect(detected, "hover 装飾の喪失を検出できない").toContain("handwritten");
  });

  test("F14 状態: dark 配色を無効化する", async ({ page, containers, entries }) => {
    test.setTimeout(300_000);
    await page.addStyleTag({
      content:
        "@media (prefers-color-scheme: dark) { :root { --foreground-rgb: 0,0,0; --background-start-rgb: 241,238,231; --background-end-rgb: 241,238,231; } }",
    });

    const detected = await detect(page, containers, entries, {
      id: "F14-dark-lost",
      fault_class: "要素スタイル（状態）",
      injection: "スタイル注入: dark の配色変数を light と同値にする",
    });
    expect(detected, "dark 配色の喪失を検出できない").toContain("handwritten");
  });

  test.afterAll(async () => {
    await writeFile(RESULT_PATH, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  });
});
