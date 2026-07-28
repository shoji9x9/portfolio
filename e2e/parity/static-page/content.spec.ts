import {
  checkAccountBadges,
  checkArtifactCard,
  checkArtifactOrder,
  checkCareerOrder,
  checkCareerProject,
  checkDesiredWork,
  checkExternalImagesRendered,
  checkFavicon,
  checkFontStackFallsThroughForCjk,
  checkPageBasicsAndSectionOrder,
  checkProfileTable,
  checkQualifications,
  checkSelfPromotion,
  checkSkillBadges,
} from "../lib/checks";
// `static-page` の表示パリティ（データ・文言・順序・リンク先）。
//
// 期待値はすべてゴールデンデータセット（`seed/data/`）から引く。スイートに値を直書きしない。
// 判定は role ＋アクセシブルネームで、id / class / nth-child をアンカーにしない。
// 判定の実体は `lib/checks.ts`（強度ゲートからも同じ関数を呼ぶ）。
import { allProjects, dataset } from "../lib/dataset";
import { test } from "../lib/fixtures";

test.describe("static-page: 表示パリティ", () => {
  test("ページの基本属性とセクションの表示順", async ({ page, containers }) => {
    await checkPageBasicsAndSectionOrder(page, containers);
  });

  test("favicon が現行と同じ", async ({ page }) => {
    await checkFavicon(page);
  });

  test("日本語がブラウザーの既定フォントへ落ちる（フォントスタックに総称ファミリーを入れない）", async ({
    page,
  }) => {
    await checkFontStackFallsThroughForCjk(page);
  });

  test("プロフィール表の見出しと 4 行", async ({ containers }) => {
    await checkProfileTable(containers);
  });

  test("アカウントバッジのリンク先と画像", async ({ containers }) => {
    await checkAccountBadges(containers);
  });

  test("自己 PR の 4 項目", async ({ containers }) => {
    await checkSelfPromotion(containers);
  });

  test("保有スキルの言語・フレームワークバッジ", async ({ containers }) => {
    await checkSkillBadges(containers);
  });

  test("職務経歴の会社・プロジェクトの表示順", async ({ containers }) => {
    await checkCareerOrder(containers);
  });

  for (const { project } of allProjects) {
    test(`職務経歴プロジェクト: ${project.id}`, async ({ containers }) => {
      await checkCareerProject(containers, project.id);
    });
  }

  test("製作物カードの表示順", async ({ containers }) => {
    await checkArtifactOrder(containers);
  });

  for (const artifact of dataset.artifacts) {
    test(`製作物: ${artifact.id}`, async ({ containers }) => {
      await checkArtifactCard(containers, artifact.id);
    });
  }

  test("資格の分類と項目", async ({ containers }) => {
    await checkQualifications(containers);
  });

  test("希望条件のリンク文言とリンク先", async ({ containers }) => {
    await checkDesiredWork(containers);
  });

  test("外部画像がすべて描画される（副作用出力: 外部画像 GET）", async ({ containers }) => {
    await checkExternalImagesRendered(containers);
  });
});
