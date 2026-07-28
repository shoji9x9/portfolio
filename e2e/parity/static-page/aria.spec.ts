// `static-page` の構造パリティ（手書きの寛容な aria スナップショット）。
//
// **採取した aria を diff しない。仕様として手で書く。** `toMatchAriaSnapshot` の既定が部分一致で
// あることを利用し、「仕様が保証する項目」だけを列挙する。列挙しなかった要素・属性は自由。
// スナップショット本体は `lib/checks.ts`（強度ゲートからも同じ関数を呼ぶ）。
//
// 部分一致の実測された性質（この設計の前提）:
//   - 余分な兄弟ノードは許容される
//   - **入れ子の深さは飛ばせない**（孫は子として一致しない）
//   - 兄弟の順序は厳密
// そのためページ全体を 1 枚で書かず、**セクション単位でアンカー**する。セクションの入れ物が
// 現行では素の `div`（a11y ツリーに現れない）、新側では `region` になっても、アンカーが
// ロケータマッピング層に吸収されるため同じスナップショットが両実装に当たる。
//
// 意図的に書かないもの:
//   - Next.js のルートアナウンサー（`<div role="alert">`）— 現行フレームワークの実装詳細
//   - セクションを包む要素の role — 現行は非セマンティック（`div`）で、新側の改善を縛らない
//   - 個々の文言・URL の網羅 — 値のパリティは `content.spec.ts` がデータセット由来で判定する
//   - アニメーション — 差分比較で停止させるため、この手法では原理的に扱えない（対象外）
//
// ビューポート: 現行 CSS の幅ベースのメディアクエリは 0 件（唯一のメディアクエリは
// `prefers-color-scheme: dark`）。したがって構造の切り替わりは無いことが仕様であり、
// 代表 2 種で「どちらでも同じ構造になる」ことを確認する。
import { VIEWPORTS } from "../../../playwright.config";
import {
  checkAriaAccount,
  checkAriaArtifactCard,
  checkAriaCareerCard,
  checkAriaCareers,
  checkAriaDesiredWork,
  checkAriaProfile,
  checkAriaQualifications,
  checkAriaSelfPromotion,
  checkAriaSkills,
} from "../lib/checks";
import { test } from "../lib/fixtures";

for (const viewport of VIEWPORTS) {
  test.describe(`static-page: 構造パリティ (${viewport.label})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("プロフィール: 見出しとキー・バリューの表", async ({ containers }) => {
      await checkAriaProfile(containers);
    });

    test("アカウント: 画像を伴うリンクにアクセシブルネームがある", async ({ containers }) => {
      await checkAriaAccount(containers);
    });

    test("自己 PR: 箇条書きリスト", async ({ containers }) => {
      await checkAriaSelfPromotion(containers);
    });

    test("保有スキル: 2 つの小見出しと画像バッジ", async ({ containers }) => {
      await checkAriaSkills(containers);
    });

    test("職務経歴: 会社見出しとプロジェクトカードの見出し階層", async ({ containers }) => {
      await checkAriaCareers(containers);
    });

    test("職務経歴カード: 4 つの小見出しとロールタスクのリスト", async ({ containers }) => {
      await checkAriaCareerCard(containers);
    });

    test("資格: 分類とその配下項目の入れ子リスト", async ({ containers }) => {
      await checkAriaQualifications(containers);
    });

    test("製作物カード: 小見出しとリンクの並び", async ({ containers }) => {
      await checkAriaArtifactCard(containers);
    });

    test("希望条件: 記事へのリンク", async ({ containers }) => {
      await checkAriaDesiredWork(containers);
    });
  });
}
