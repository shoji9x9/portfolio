// `static-page` の操作・状態のパリティ。
//
// 現行 `/` は読み取り専用の静的ページで、フォーム・ダイアログ・検索・フィルター・ページネーション・
// バリデーション・トースト・権限差・明示的なローディング UI を持たない（`gaps.md` に対象外として記録）。
// そのため対象となる状態は「リンクの hover / focus」「キーボード到達性」「配色スキーム」の 3 つ。
//
// **見た目そのものの比較は parity-diff の担当**であり、ここでは「状態へ遷移させること」と
// 「状態が振る舞いとして存在すること」までを判定する。具体的な色値は実装（Tailwind のバージョンや
// パレット）で変わりうるため契約にしない。判定の実体は `lib/checks.ts`。
import {
  checkBadgeLinkHoverUnchanged,
  checkBodyLinkHoverChangesColor,
  checkColorSchemeSwitch,
  checkFocusRing,
  checkTabOrder,
} from "../lib/checks";
import { expect, test } from "../lib/fixtures";

test.describe("static-page: 操作・状態", () => {
  test("本文リンクは hover で文字色が変わる", async ({ page, containers }) => {
    await checkBodyLinkHoverChangesColor(page, containers);
  });

  test("アカウントバッジのリンクは hover で見た目が変わらない", async ({ page, containers }) => {
    await checkBadgeLinkHoverUnchanged(page, containers);
  });

  test("キーボードでリンクへ到達でき、フォーカス表示が出る", async ({ page, containers }) => {
    await checkFocusRing(page, containers);
  });

  test("Tab の到達順が文書順と一致する（停止数は問わない）", async ({ page, containers }) => {
    await checkTabOrder(page);
    // LAPRAS リンク（機能 lapras の担当）が同じページに同居することを確認する。
    await expect(containers.section("lapras").getByRole("link")).toHaveCount(1);
  });

  test("配色スキーム: dark で本文色と背景が切り替わる", async ({ page }) => {
    await checkColorSchemeSwitch(page);
  });
});
