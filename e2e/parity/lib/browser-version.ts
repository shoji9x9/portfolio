// ベースライン採取ブラウザーの陳腐化ガード。
//
// 視覚ベースライン（スクリーンショット・computed style・参考 aria）は、採取に使ったブラウザーの
// 描画結果そのものである。現行側ベースラインを採った Chromium と、新側を採る Chromium が
// 食い違うと、**実装差ではない差分**が parity-diff に流れ込む。採取条件は `metadata.json` に
// 自由記述で書かれてはいたが実行時に検査されていなかったため、この不一致は誰にも気づかれない。
//
// ここでは採取条件を機械可読にし（`capture_conditions.browser`）、採取・照合の実行時に
// 実行中のバージョンと突き合わせて、ずれていれば明示的なメッセージで落とす。
//
// **CI 側でこの一致を検査してはいけない。** 検査を CI に置くと Playwright の更新 PR 自体が
// 赤くなり、更新のたびに全機能のベースライン再採取を強制することになる。ガードは
// 「次にパリティ比較を行うとき」にだけ発火すればよく、それが更新を通常の依存更新として
// 扱えるようにする条件でもある（Issue #44）。
import type { Browser } from "@playwright/test";

import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

/** `metadata.json` の `capture_conditions.browser`（採取条件の機械可読部分）。 */
type BaselineBrowser = {
  /** ブラウザーエンジン名（`browserType().name()` と同じ語彙）。 */
  engine: string;
  /** 採取に使った Playwright のバージョン。 */
  playwright_version: string;
  /** Playwright が同梱するブラウザーのバージョン。 */
  browser_version: string;
};

/** 検査対象の側。失敗時に案内する手当てが異なる。 */
export type CaptureSide = "current" | "new";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 実行中の Playwright のバージョン。`@playwright/test` は `./package.json` を公開している。 */
function runningPlaywrightVersion(): string {
  const requireFromHere = createRequire(import.meta.url);
  const pkg: unknown = requireFromHere("@playwright/test/package.json");
  const version = isRecord(pkg) ? Reflect.get(pkg, "version") : undefined;
  if (typeof version !== "string") {
    throw new Error("@playwright/test の package.json から version を読み取れません。");
  }
  return version;
}

function runningBrowser(browser: Browser): BaselineBrowser {
  return {
    engine: browser.browserType().name(),
    playwright_version: runningPlaywrightVersion(),
    browser_version: browser.version(),
  };
}

/** `metadata.json` から `capture_conditions.browser` を型付きで取り出す。 */
function parseBaselineBrowser(source: string, path: string): BaselineBrowser {
  const parsed: unknown = JSON.parse(source);
  const conditions = isRecord(parsed) ? Reflect.get(parsed, "capture_conditions") : undefined;
  const browser = isRecord(conditions) ? Reflect.get(conditions, "browser") : undefined;
  if (!isRecord(browser)) {
    throw new Error(
      `capture_conditions.browser が記録されていません: ${path}\n` +
        "ベースラインの採取ブラウザーを機械可読に記録してください" +
        "（engine / playwright_version / browser_version）。",
    );
  }

  const engine = Reflect.get(browser, "engine");
  const playwrightVersion = Reflect.get(browser, "playwright_version");
  const browserVersion = Reflect.get(browser, "browser_version");
  if (
    typeof engine !== "string" ||
    typeof playwrightVersion !== "string" ||
    typeof browserVersion !== "string"
  ) {
    throw new Error(
      `capture_conditions.browser の形が不正です: ${path}\n` +
        "engine / playwright_version / browser_version をいずれも文字列で記録してください。",
    );
  }
  return { engine, playwright_version: playwrightVersion, browser_version: browserVersion };
}

function describe(browser: BaselineBrowser): string {
  return `${browser.engine} ${browser.browser_version}（Playwright ${browser.playwright_version}）`;
}

function remedy(side: CaptureSide, metadataPath: string): string {
  if (side === "current") {
    return (
      "意図したブラウザー更新なら、\n" +
      `  1. ${metadataPath} の capture_conditions.browser を実行中の値へ更新し、\n` +
      "  2. 現行側ベースラインを採り直す（この採取をもう一度実行する）。\n" +
      "意図しない差なら、実行環境の Playwright を記録値へ揃えてから採取し直す。"
    );
  }
  return (
    "現行側ベースラインは記録値のブラウザーで採られているため、このまま新側を採って比較すると\n" +
    "実装差ではない差分が出る。**現行側ベースラインの採り直しが必要**:\n" +
    `  1. ${metadataPath} の capture_conditions.browser を実行中の値へ更新し、\n` +
    "  2. 現行側の baseline.spec.ts / strength.spec.ts を実行し直してから、\n" +
    "  3. 新側の採取・比較へ戻る。\n" +
    "現行側を採り直さない場合は、実行環境の Playwright を記録値へ揃える。"
  );
}

/**
 * 実行中のブラウザーが、対象 slug のベースライン採取条件と一致することを検査する。
 * 不一致なら採取・比較を続けず、どちらの側で何をすべきかを示して失敗させる。
 */
export async function assertBaselineBrowser(
  browser: Browser,
  slug: string,
  side: CaptureSide,
): Promise<void> {
  const repoRoot = process.env["PARITY_REPO_ROOT"] ?? process.cwd();
  const metadataPath = join(repoRoot, ".replace", "parity", slug, "metadata.json");
  const recorded = parseBaselineBrowser(await readFile(metadataPath, "utf8"), metadataPath);
  const running = runningBrowser(browser);

  // playwright_version も完全一致で見る（同梱 Chromium が変わらないパッチ更新でも発火する）。
  // 採取物に効くのはブラウザーの描画だけではなく、Playwright 側のスクリーンショット合成・
  // ariaSnapshot の出力形式も版で変わりうるためで、緩めると「差が出ないはずだった更新」を
  // 見逃す側に倒れる。発火時に metadata だけ書き換えて再採取を省くと、ガードは無効になる。
  if (
    recorded.engine === running.engine &&
    recorded.playwright_version === running.playwright_version &&
    recorded.browser_version === running.browser_version
  ) {
    return;
  }

  throw new Error(
    `ベースライン採取ブラウザーが実行中のブラウザーと一致しません（slug: ${slug}）。\n` +
      `  記録値: ${describe(recorded)}\n` +
      `  実行値: ${describe(running)}\n` +
      remedy(side, metadataPath),
  );
}
