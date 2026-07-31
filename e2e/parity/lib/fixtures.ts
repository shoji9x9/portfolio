// パリティスイート共通のフィクスチャ。
//
// Playwright の project 名（`current` / `new` / `new-capture`）から側を決め、その側のコンテナーマッピングを注入する。
// スペック本体は論理名と操作意図だけを書き、どちらの側で走っているかを意識しない。
import type { LogicalEntry } from "./locator-map/portable";
import type { ContainerLocators } from "./locator-map/types";

import { test as base, expect } from "@playwright/test";

import { currentContainers } from "./locator-map/current";
import { logicalEntries } from "./locator-map/portable";
import { newContainers } from "./locator-map/static-page.new";

export type ParityFixtures = {
  /** 側ごとのコンテナー解決。 */
  containers: ContainerLocators;
  /** 論理名 → ロケータのカタログ（決定論的な順序）。 */
  entries: LogicalEntry[];
  /** 対象ページ（`/`）を開いた状態。全スペックの前提なので auto フィクスチャにする。 */
  portfolioPage: void;
};

/** ページ遷移完了の判定条件。外部画像（Shields.io・AtCoder）の取得完了まで待つ。 */
const NAVIGATION_WAIT = "networkidle" as const;

export const test = base.extend<ParityFixtures>({
  containers: async ({ page }, use, testInfo) => {
    const side = testInfo.project.name;
    if (side === "current") {
      await use(currentContainers(page));
      return;
    }
    if (side === "new" || side === "new-capture") {
      await use(newContainers(page));
      return;
    }
    throw new Error(
      `未知の project 名です: ${side}（current / new / new-capture のいずれかを指定する）`,
    );
  },

  entries: async ({ containers }, use) => {
    await use(logicalEntries(containers));
  },

  portfolioPage: [
    async ({ page }, use, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      if (baseURL === undefined || baseURL === "") {
        throw new Error(
          `project=${testInfo.project.name} の baseURL が未解決です。` +
            "PARITY_CURRENT_UI_URL / PARITY_NEW_UI_URL を設定して実行してください（URL は設定の targets から解決する）。",
        );
      }
      await page.goto("/", { waitUntil: NAVIGATION_WAIT });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
