// ロケータマッピング層の契約（現・新をまたぐ）。
//
// 設計方針: **側ごとに差し替えるのはコンテナーの解決だけ**にする。
// 現行アプリは `/` 内のセクション・カードがいずれも role を持たない素の `div` で、role +
// アクセシブルネームでは引けない（＝ここが唯一の「非セマンティックな箇所」）。
// 逆に、コンテナーさえ解決できればその内側は見出し・リンク・画像・表・リストの role +
// アクセシブルネームだけで引けるため（`portable.ts`）、新側で書く例外はこの 4 つに限られる。
import type { Locator } from "@playwright/test";

/** `/` の表示セクション。`lapras` は機能 `lapras`（Issue #23）の担当でありスコープ外。 */
export type SectionId =
  | "profile"
  | "account"
  | "self-promotion"
  | "skills"
  | "careers"
  | "artifacts"
  | "qualifications"
  | "desired-work"
  | "lapras";

/** 側ごとに実装が変わるコンテナー解決。これ以外の要素解決は `portable.ts` が共通で担う。 */
export type ContainerLocators = {
  /** ページ本体（role=main）。 */
  main: () => Locator;
  /** 表示セクション。見出し（h2）で識別する。 */
  section: (id: SectionId) => Locator;
  /** 職務経歴の 1 プロジェクトカード。`careers.json` の project.id で識別する。 */
  careerProjectCard: (projectId: string) => Locator;
  /** 製作物の 1 カード。`artifacts.json` の artifact.id で識別する。 */
  artifactCard: (artifactId: string) => Locator;
};
