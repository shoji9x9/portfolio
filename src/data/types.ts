// 新側の静的データ形式（スキーマ）。
//
// ゴールデンデータセットのフェーズ B が、フェーズ A の論理データ（`seed/data/`）をこの形式へ
// 写像して `src/data/*.json` を生成する。アプリはここで定義した型を通してのみデータを読む。
//
// 論理データ（件数・安定 ID・表示順）は現行と同一で、宣言済みの意図的差異だけが値として異なる
// （`intentional_diffs.may_change` の「GitHub の綴りの是正（新側のみ）」）。

/** プロフィール表の 1 行。 */
export type ProfileEntry = {
  id: string;
  label: string;
  value: string;
};

/** バッジ 1 件。 */
export type Badge = {
  id: string;
  label: string;
  imageSrc: string;
};

/** アカウントバッジ。必ずリンク先を持ち、画像をリンクで包んで描画する。 */
type AccountBadge = Badge & {
  href: string;
};

/** バッジの群。表示順は配列順が正本。 */
export type BadgeGroups = {
  account: AccountBadge[];
  language: Badge[];
  framework: Badge[];
};

type RoleTask = {
  summary: string;
  items: string[];
};

export type Project = {
  id: string;
  name: string;
  term: string;
  roleTasks: RoleTask[];
  /** `items` はバッジの安定 ID の並び。表示名・画像 URL は `badges.json` から引く。 */
  techStack: {
    items: string[];
    comment?: string;
  };
  members: {
    team: number;
    project: number;
  };
};

export type Career = {
  id: string;
  company: string;
  projects: Project[];
};

export type Artifact = {
  id: string;
  title: string;
  url: string;
  repositoryUrl: string;
  /** 紹介記事。書いていない製作物では持たず、カードの「記事」見出しごと描画しない。 */
  article?: {
    title: string;
    url: string;
  };
  /** バッジの安定 ID の並び。 */
  techStack: string[];
};

/** 資格の分類 1 つ。フェーズ A はオブジェクトのキー順で持つが、新側は配列で順序を明示する。 */
export type QualificationGroup = {
  id: string;
  name: string;
  items: string[];
};

export type StaticContent = {
  selfPromotion: string[];
  qualifications: QualificationGroup[];
  desiredWork: {
    title: string;
    url: string;
  };
};

/** LAPRAS 公開プロフィール。プレビュー内容は実行時 API が返すため静的データへ含めない。 */
export type Lapras = {
  publicUrl: string;
};
