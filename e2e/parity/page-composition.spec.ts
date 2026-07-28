// ページ `/` の在席チェック（機能をまたぐ）。
//
// **機能ごとのパリティスイートは、その機能のセクションだけを判定する。** そうしないと 1 機能を
// 単独で green にできず「1 ページを作り切ってから次へ」という進め方が崩れるため。
// その代償として「まだ実装していない機能のセクションが欠けている」ことを誰も見なくなる。
//
// このスペックはその隙間だけを埋める。`.replace/features.md` が `/` に紐づけた機能のセクションが
// **すべて揃っているか**を見る。未実装の機能があるうちは `test.fixme` にしておき、
// 実行のたびに「保留」として報告へ出し続ける（green は妨げない）。
// 担当 Issue が実装したら `fixme` を外すと本物の assertion になる。
import { expect, test } from "./lib/fixtures";

/**
 * `/` に載る機能とそのセクション見出し。正本は `.replace/features.md`。
 * `owner` は features.md の Issue 列。
 */
const SECTIONS_ON_ROOT = [
  { heading: "プロフィール", feature: "static-page", owner: "#22", implemented: true },
  { heading: "アカウント", feature: "static-page", owner: "#22", implemented: true },
  { heading: "自己PR", feature: "static-page", owner: "#22", implemented: true },
  { heading: "保有スキル", feature: "static-page", owner: "#22", implemented: true },
  { heading: "職務経歴詳細", feature: "static-page", owner: "#22", implemented: true },
  { heading: "資格", feature: "static-page", owner: "#22", implemented: true },
  { heading: "製作物", feature: "static-page", owner: "#22", implemented: true },
  { heading: "希望条件", feature: "static-page", owner: "#22", implemented: true },
  { heading: "LAPRAS", feature: "lapras", owner: "#23", implemented: false },
] as const;

const pending = SECTIONS_ON_ROOT.filter((section) => !section.implemented);

test.describe("ページ `/` の在席チェック（機能をまたぐ）", () => {
  test("実装済み機能のセクションが features.md の順で揃っている", async ({ page }) => {
    const headings = await page
      .getByRole("main")
      .getByRole("heading", { level: 2 })
      .allInnerTexts();
    const normalized = headings.map((text) => text.replaceAll(/\s+/g, ""));

    for (const section of SECTIONS_ON_ROOT.filter((entry) => entry.implemented)) {
      expect(
        normalized.some((text) => text.startsWith(section.heading)),
        `${section.feature}（${section.owner}）のセクション「${section.heading}」が無い`,
      ).toBe(true);
    }
  });

  // 未実装の機能が残っている間だけ fixme。担当 Issue が実装したら `SECTIONS_ON_ROOT` の
  // `implemented` を true にして、この test.fixme を test に戻す。
  test.fixme(`未実装の機能のセクションが揃っている（残り: ${pending.map((s) => `${s.heading}=${s.owner}`).join(", ")}）`, async ({
    page,
  }) => {
    const headings = await page
      .getByRole("main")
      .getByRole("heading", { level: 2 })
      .allInnerTexts();
    const normalized = headings.map((text) => text.replaceAll(/\s+/g, ""));

    for (const section of pending) {
      expect(
        normalized.some((text) => text.startsWith(section.heading)),
        `${section.feature}（${section.owner}）のセクション「${section.heading}」が無い`,
      ).toBe(true);
    }
  });
});
