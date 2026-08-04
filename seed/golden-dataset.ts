// ポートフォリオの表示データの正本（論理データ）。
//
// **役割が変わっている。** 移行（Issue #22 / #23）が収束するまでは「現行 shoji9x9.github.io の
// 忠実な再現」が契約だったが、移行完了後の Issue #31 で「ポートフォリオの正本」へ変えた。
// 現行サイトはもう更新しないため、ここから先の内容の変更は現行との差分になる
// （設定の `intentional_diffs.may_change`「移行完了後のコンテンツ更新（新側のみ）」で宣言済み）。
// 経緯と影響は `.replace/references/static-data-semantics.md` を参照する。
type Badge = { id: string; label: string; href?: string; imageSrc: string };
type Project = {
  id: string;
  name: string;
  term: string;
  roleTasks: { summary: string; items: string[] }[];
  techStack: { items: string[]; comment?: string };
  members: { team: number; project: number };
};

function createLinkedBadges(
  values: readonly (readonly [string, string, string, string])[],
): Badge[] {
  return values.map(([id, label, href, imageSrc]) => ({
    id,
    label,
    href,
    imageSrc,
  }));
}

function createImageBadges(values: readonly (readonly [string, string, string])[]): Badge[] {
  return values.map(([id, label, imageSrc]) => ({ id, label, imageSrc }));
}

const accountBadges = createLinkedBadges([
  [
    "github",
    // 表記は現行アプリの実値をそのまま再現する（`services/badges.ts` のキー = img の alt）。
    // 一般的な綴りは "GitHub" だが、正しい綴りへ直すのは意図的差異であり、レジストリで宣言せずに
    // データセット側で正規化しない。
    "Github",
    "https://github.com/shoji9x9",
    "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=Github&logoColor=white",
  ],
  [
    "twitter",
    "Twitter",
    "https://twitter.com/shoji9x9",
    "https://img.shields.io/badge/@shoji9x9-%231DA1F2.svg?&style=flat-square&logo=twitter&logoColor=white",
  ],
  [
    "qiita",
    "Qiita",
    "https://qiita.com/shoji9x9",
    "https://img.shields.io/badge/shoji9x9-55C500.svg?&style=flat-square&logo=qiita&logoColor=white",
  ],
  [
    "zenn",
    "Zenn",
    "https://zenn.dev/shoji9x9",
    "https://img.shields.io/badge/shoji9x9-3EA8FF.svg?&style=flat-square&logo=Zenn&logoColor=white",
  ],
  [
    "atcoder",
    "AtCoder",
    "https://atcoder.jp/users/shoji9x9",
    "https://img.shields.io/endpoint?url=https%3A%2F%2Fatcoder-badges.now.sh%2Fapi%2Fatcoder%2Fjson%2Fshoji9x9",
  ],
]);

const languageBadges = createImageBadges([
  [
    "javascript",
    "JavaScript",
    "https://img.shields.io/badge/-JavaScript-F7DF1E?style=flat-square&logo=JavaScript&logoColor=white",
  ],
  [
    "python",
    "Python",
    "https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=Python&logoColor=white",
  ],
  [
    "typescript",
    "TypeScript",
    "https://img.shields.io/badge/-TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white",
  ],
  [
    "csharp",
    "CSharp",
    "https://img.shields.io/badge/c%23-%23239120.svg?style=for-the-badge&logo=c-sharp&logoColor=white",
  ],
  [
    "php",
    "PHP",
    "https://img.shields.io/badge/PHP-ccc.svg?logo=php&color=777BB4&style=flat-square&logoColor=white",
  ],
  [
    "java",
    "Java",
    "https://img.shields.io/badge/java-%23ED8B00.svg?style=for-the-badge&logo=openjdk&logoColor=white",
  ],
  [
    "cobol",
    "COBOL",
    "https://img.shields.io/badge/COBOL-ccc.svg?logo=cobol&color=1572B6&style=flat-square&logoColor=white",
  ],
]);

const frameworkBadges = createImageBadges([
  [
    "outsystems",
    "OutSystems",
    "https://img.shields.io/badge/-OutSystems-fa173d.svg?logo=&style=flat-square",
  ],
  [
    "tensorflow",
    "TensorFlow",
    "https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=for-the-badge&logo=TensorFlow&logoColor=white",
  ],
  [
    "react",
    "React",
    "https://img.shields.io/badge/-React-45b8d8?style=flat-square&logo=react&logoColor=white",
  ],
  ["recoil", "Recoil", "https://img.shields.io/badge/-Recoil-3578e5.svg?logo=&style=flat-square"],
  [
    "nextjs",
    "NextJS",
    "https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white",
  ],
  [
    "vite",
    "Vite",
    "https://img.shields.io/badge/Vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white",
  ],
  [
    "tailwindcss",
    "TailwindCSS",
    "https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white",
  ],
  [
    "shadcnui",
    "shadcn/ui",
    "https://img.shields.io/badge/shadcn%2Fui-%23000000.svg?style=for-the-badge&logo=shadcnui&logoColor=white",
  ],
  [
    "storybook",
    "Storybook",
    "https://img.shields.io/badge/-Storybook-FF4785?style=for-the-badge&logo=storybook&logoColor=white",
  ],
  [
    "drupal",
    "Drupal",
    "https://img.shields.io/badge/drupal-%230678BE.svg?style=for-the-badge&logo=drupal&logoColor=white",
  ],
  [
    "firebase",
    "Firebase",
    "https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase",
  ],
  [
    "oracle",
    "Oracle",
    "https://img.shields.io/badge/-Oracle-F80000.svg?logo=oracle&style=flat-square",
  ],
  [
    "db2",
    "DB2",
    "https://img.shields.io/badge/DB2-ccc.svg?logo=db2&color=0F4D92&style=flat-square&logoColor=white",
  ],
  [
    "postgresql",
    "PostgreSQL",
    "https://img.shields.io/badge/PostgreSQL-%234169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white",
  ],
  [
    "mysql",
    "MySQL",
    "https://img.shields.io/badge/MySQL-%234479A1.svg?style=for-the-badge&logo=mysql&logoColor=white",
  ],
  // DynamoDB・AWS・OpenAI のロゴは shields.io（simple-icons）に存在しないため文字のみのバッジにする。
  // 既存の OutSystems・Recoil と同じ形。
  [
    "dynamodb",
    "DynamoDB",
    "https://img.shields.io/badge/DynamoDB-%234053D6.svg?style=for-the-badge",
  ],
  [
    "azure",
    "Azure",
    "https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white",
  ],
  ["aws", "AWS", "https://img.shields.io/badge/AWS-%23232F3E.svg?style=for-the-badge"],
  [
    "vercel",
    "Vercel",
    "https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white",
  ],
  [
    "cloudflare",
    "Cloudflare",
    "https://img.shields.io/badge/Cloudflare-%23F38020.svg?style=for-the-badge&logo=cloudflare&logoColor=white",
  ],
  [
    "docker",
    "Docker",
    "https://img.shields.io/badge/Docker-%232496ED.svg?style=for-the-badge&logo=docker&logoColor=white",
  ],
  [
    "figma",
    "Figma",
    "https://img.shields.io/badge/Figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white",
  ],
  ["openai", "OpenAI", "https://img.shields.io/badge/OpenAI-%23412991.svg?style=for-the-badge"],
  [
    "github-actions",
    // 現行アプリの実値（`frameworkBadges` のキー = img の alt）。上の "Github" と同じ理由で正規化しない。
    "GithubActions",
    "https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white",
  ],
]);

const projects: Project[] = [
  {
    id: "freelance-pharma-ir",
    name: "製薬会社向けIR分析システムの開発",
    term: "2026年6月～2026年7月",
    roleTasks: [
      {
        summary: "開発メンバーとして以下を担当。",
        items: [
          "フロントエンド、バックエンドの開発・運用",
          "コーディングエージェントが主体的に開発する (人がボトルネックとならない) 環境の構築",
          "OpenAIを利用したIR資料の収集・分析、事業戦略の変化検知の実装",
        ],
      },
    ],
    techStack: { items: ["TypeScript", "React", "DynamoDB", "AWS", "OpenAI"] },
    members: { team: 1, project: 1 },
  },
  {
    id: "freelance-design-system",
    name: "デザインシステムの開発、運用",
    term: "2025年8月～2026年7月",
    roleTasks: [
      {
        summary: "開発メンバーとして以下を担当。",
        items: [
          "技術スタック選定",
          "Figmaデザインの作成、UIコンポーネントの開発・運用",
          "デザイントークン、各UIコンポーネントの用途・プロパティの定義",
          "コーディングエージェント主体へ移行するための品質担保 (プレビュー環境でのテスト、VRTの導入)",
        ],
      },
    ],
    techStack: { items: ["TypeScript", "React", "shadcn/ui", "Storybook", "AWS", "Figma"] },
    members: { team: 3, project: 3 },
  },
  {
    id: "freelance-investment",
    name: "商社向け投資判断支援システムの開発、運用",
    term: "2025年6月～2026年5月",
    roleTasks: [
      {
        summary: "開発メンバーとして以下を担当。",
        items: [
          "技術スタック選定 (フロントエンド)",
          "フロントエンド、バックエンドの開発・運用",
          "チャット (Markdown描画)、チャート、ツリー等の複雑なUIの実装",
          "OpenAIを利用したPDFファイルの要約の実装",
        ],
      },
    ],
    techStack: {
      items: ["TypeScript", "NextJS", "MySQL", "AWS", "Docker", "Figma", "OpenAI"],
    },
    members: { team: 2, project: 2 },
  },
  {
    id: "freelance-case-management",
    name: "商社向け案件状況管理システムの開発",
    term: "2023年10月～2026年7月",
    roleTasks: [
      {
        summary:
          "開発メンバーとして以下を担当 (当初はフロントエンド担当として参画し、最終的にはバックエンド、インフラも1人で担当)。",
        items: ["要件定義、技術スタック選定", "フロントエンド、バックエンド、インフラの開発・運用"],
      },
    ],
    techStack: { items: ["TypeScript", "NextJS", "PostgreSQL", "AWS", "Docker", "Figma"] },
    members: { team: 2, project: 2 },
  },
  {
    id: "freelance-sales",
    name: "自動車会社基幹システム（商品販売システム）の再構築",
    term: "2023年1月～2023年9月",
    roleTasks: [
      {
        summary: "アーキテクトチームのメンバーとして以下を担当。",
        items: [
          "フロントエンドのアーキテクチャー検討と検証 (Drupal、React)",
          "検証計画書、検証結果報告書の作成と顧客への報告",
        ],
      },
    ],
    techStack: {
      items: ["TypeScript", "PHP", "React", "Drupal", "Azure"],
      comment: "上記以外にプロジェクトで採用しているDDD、CQRS、マイクロサービス等の技術も学んだ。",
    },
    members: { team: 10, project: 50 },
  },
  {
    id: "freelance-construction",
    name: "自動車会社基幹システム（工事管理システム）の再構築",
    term: "2022年1月～2023年3月",
    roleTasks: [
      {
        summary: "アーキテクトチームのリーダーとして以下を担当。",
        items: [
          "システム/ソフトウェアアーキテクチャー設計",
          "開発標準策定",
          "開発者の技術支援、レビュー",
          "アプリケーション全体のテーブル設計 (ER図作成など)",
        ],
      },
    ],
    techStack: { items: ["JavaScript", "CSharp", "OutSystems", "Oracle"] },
    members: { team: 3, project: 30 },
  },
  {
    id: "toyota-rideshare",
    name: "中国ライドシェア会社向け車両管理システムの新規開発",
    term: "2020年1月～2021年6月",
    roleTasks: [
      {
        summary: "プロダクトオーナーとして以下を担当。",
        items: ["事業計画立案", "要件定義、受入テスト", "顧客との折衝"],
      },
    ],
    techStack: { items: [], comment: "プロジェクトとしてはJava、Hadoop、Kafka等を利用していた。" },
    members: { team: 20, project: 20 },
  },
  {
    id: "toyota-core-rebuild",
    name: "自社基幹システム（試作車生産管理、部品調達、生産システム）の再構築",
    term: "2017年4月～2019年12月",
    roleTasks: [
      {
        summary: "2017年4月～2018年12月はプロジェクトマネージャーとして以下を担当。",
        items: [
          "企画 (SAFeを導入)",
          "構想検討、要件定義のマネジメント (方針検討、成果物のレビュー、プロジェクト運営)",
        ],
      },
      {
        summary: "2019年1月～2019年12月はアーキテクトチームのリーダーとして以下を担当。",
        items: [
          "システム/ソフトウェアアーキテクチャー設計",
          "開発標準策定",
          "開発者の技術支援、レビュー",
        ],
      },
    ],
    techStack: { items: ["JavaScript", "CSharp", "OutSystems", "Oracle"] },
    members: { team: 5, project: 30 },
  },
  {
    id: "toyota-outsystems",
    name: "OutSystemsを利用したアプリケーション開発のトライアル、展開",
    term: "2014年1月～2018年12月",
    roleTasks: [
      {
        summary: "プロジェクトマネージャーとして以下を担当。",
        items: [
          "段階的なトライアルと評価の企画",
          "他部署への展開とサポートの企画、実行時のマネジメント",
          "開発元 (OutSystems社) との製品改善交渉、要件定義",
        ],
      },
    ],
    techStack: {
      items: ["JavaScript", "OutSystems"],
      comment: "OutSystems用データグリッドを作るため、ag-GridやWijmoも利用した。",
    },
    members: { team: 10, project: 10 },
  },
  {
    id: "toyota-core-operations",
    name: "自社基幹システム（試作車生産管理、部品調達、生産システム）の改善、保守運用",
    term: "2007年1月～2017年12月",
    roleTasks: [
      {
        summary: "プロジェクトマネージャーとして以下を担当。",
        items: [
          "企画、構想検討、要件定義",
          "各局面におけるにおけるマネジメント (成果物のレビュー、プロジェクト運営、トラブル時の陣頭指揮)",
        ],
      },
    ],
    techStack: { items: ["Java", "COBOL", "DB2"] },
    members: { team: 15, project: 15 },
  },
];

export const goldenDataset = {
  profile: [
    { id: "occupation", label: "職業", value: "フリーランスのソフトウェアエンジニア (2022年～)" },
    { id: "residence", label: "居住地", value: "愛知県" },
    { id: "birth-year", label: "生まれ", value: "1982年" },
    { id: "education", label: "最終学歴", value: "大阪大学 基礎工学部 情報科学科 卒業" },
  ],
  badges: { account: accountBadges, language: languageBadges, framework: frameworkBadges },
  careers: [
    {
      id: "freelance",
      company: "フリーランス (2022年1月～現在)",
      projectIds: [
        "freelance-pharma-ir",
        "freelance-design-system",
        "freelance-investment",
        "freelance-case-management",
        "freelance-sales",
        "freelance-construction",
      ],
    },
    {
      id: "toyota",
      company: "トヨタ自動車株式会社 (2005年4月～2021年6月)",
      projectIds: [
        "toyota-rideshare",
        "toyota-core-rebuild",
        "toyota-outsystems",
        "toyota-core-operations",
      ],
    },
  ].map(({ projectIds, ...career }) => ({
    ...career,
    projects: projectIds.map((id) => {
      const project = projects.find((candidate) => candidate.id === id);
      if (!project) {
        throw new Error(`職務経歴のプロジェクト ${id} が見つかりません。`);
      }
      return project;
    }),
  })),
  artifacts: [
    // 記事は書いていないため `article` を持たない。任意項目であり、無いときはカードの
    // 「記事」見出しごと描画しない（`src/components/portfolio/ArtifactSection.tsx`）。
    {
      id: "portfolio",
      title: "ポートフォリオ（このページ）",
      url: "https://shoji9x9.pages.dev/",
      repositoryUrl: "https://github.com/shoji9x9/portfolio",
      techStack: ["React", "TypeScript", "Vite", "TailwindCSS", "Cloudflare", "GithubActions"],
    },
    {
      id: "qiita-search",
      title: "Qiita記事検索",
      url: "https://search-components-mui.vercel.app/",
      repositoryUrl: "https://github.com/shoji9x9/search_components_mui",
      article: {
        title: "React、TypeScriptでQiita記事検索機能作ってみた",
        url: "https://zenn.dev/shoji9x9/articles/cdc688518da3f8",
      },
      techStack: ["React", "TypeScript", "Storybook", "Vercel"],
    },
    {
      id: "memo-app",
      title: "メモアプリ",
      url: "https://vite-react-f4c90.web.app/",
      repositoryUrl: "https://github.com/shoji9x9/memo-app",
      article: {
        title: "React（TypeScript） + Firebaseでメモアプリ開発",
        url: "https://zenn.dev/shoji9x9/articles/eb185b3d66567b",
      },
      techStack: ["React", "TypeScript", "Recoil", "Firebase"],
    },
  ],
  staticContent: {
    selfPromotion: [
      "数百万円～十億円以上の大小50以上のプロジェクトを立ち上げてきた経験を持ち、問題点の把握、原因の分析、ROIの高い対策の立案が得意です",
      "アサインされたタスクが適切かをまず考え、適切でないと感じたときは背景や問題を確認した上で代案を提示します。期日と合格条件を確認し、そこから必要なマイルストーンを自ら設定して進めます",
      "コーディングエージェントが主体的に開発を進められる環境を設計し、人がボトルネックとならない開発プロセスを構築しています",
      "エージェント主体へ移行しても品質を落とさないよう、プレビュー環境でのテストやVRT (ビジュアルリグレッションテスト) など検証の仕組みを併せて用意します",
    ],
    qualifications: {
      "情報処理推進機構 (IPA)": [
        "基本情報技術者",
        "応用情報技術者",
        "システムアーキテクト",
        "プロジェクトマネージャ",
      ],
      "日本ディープラーニング協会 (JDLA)": ["G検定", "E資格"],
      AWS: ["AWS Certified Cloud Practitioner"],
      その他: ["英語検定2級", "日商簿記検定2級"],
    },
    // 希望条件セクションの唯一のリンク。リンク文言もページ上の静的テキストなので論理データに含める
    // （URL だけだとパリティスイートがリンク文言を検証できない）。
    desiredWorkTitle: "狩野モデルで考える、自分が希望する労働環境",
    desiredWorkUrl: "https://zenn.dev/shoji9x9/articles/741bba963942a6",
  },
  lapras: {
    publicUrl: "https://lapras.com/public/shoji9x9",
    preview: "gap: linkpreview.net の秘密鍵を要するレスポンスは収録しない",
  },
} as const;

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * 生成物を「相対パス → 内容」の写像として組み立てる。純粋関数なのでファイルへ書かずに検証・
 * fingerprint 算出ができる。キー順・インデント・末尾改行を固定しているため決定論的である。
 */
export function serializeDataset(): Map<string, string> {
  const entries: [string, unknown][] = [
    ["profile.json", goldenDataset.profile],
    ["badges.json", goldenDataset.badges],
    ["careers.json", goldenDataset.careers],
    ["artifacts.json", goldenDataset.artifacts],
    ["static-content.json", goldenDataset.staticContent],
    ["lapras.json", goldenDataset.lapras],
  ];
  return new Map(entries.map(([path, value]) => [path, `${JSON.stringify(value, null, 2)}\n`]));
}

/**
 * 生成物の決定論的ハッシュ。パス順に正規化し、パスと内容の両方を混ぜる
 * （内容が同じでもファイル構成が変われば別の値になる）。
 */
export function fingerprintOf(files: Map<string, string>): string {
  const normalized = [...files.entries()]
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([path, content]) => `${path}\0${content}`)
    .join("\0");
  return fingerprint(normalized);
}

export function verifyGoldenDataset(): {
  fingerprint: string;
  counts: Record<string, number>;
} {
  const ids = [
    ...goldenDataset.profile.map((item) => item.id),
    ...goldenDataset.badges.account.map((item) => item.id),
    ...goldenDataset.badges.language.map((item) => item.id),
    ...goldenDataset.badges.framework.map((item) => item.id),
    ...goldenDataset.careers.map((item) => item.id),
    ...goldenDataset.careers.flatMap((item) => item.projects.map((project) => project.id)),
    ...goldenDataset.artifacts.map((item) => item.id),
  ];
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^[a-z0-9-]+$/.test(id))) {
    throw new Error("安定 ID が一意でないか、形式が不正です。");
  }
  const projectsCount = goldenDataset.careers.flatMap((career) => career.projects).length;
  if (projectsCount !== 10) {
    throw new Error("職務経歴の件数が正本の件数と一致しません。");
  }
  return {
    fingerprint: fingerprintOf(serializeDataset()),
    counts: {
      profile: goldenDataset.profile.length,
      accountBadges: goldenDataset.badges.account.length,
      languageBadges: goldenDataset.badges.language.length,
      frameworkBadges: goldenDataset.badges.framework.length,
      careers: goldenDataset.careers.length,
      projects: projectsCount,
      artifacts: goldenDataset.artifacts.length,
      selfPromotion: goldenDataset.staticContent.selfPromotion.length,
      qualificationGroups: Object.keys(goldenDataset.staticContent.qualifications).length,
    },
  };
}

/**
 * 生成・削除を許された唯一の範囲。設定 `skills.replace-strategy.dataset_static_paths` の `seed/data/` と
 * 一致していなければならない（この配下以外へ書こうとしたら停止する、という設定由来ゲートの実装）。
 */
const dataDirectory = new URL("data/", import.meta.url);

function assertWithinDataDirectory(target: URL): void {
  // `new URL()` は `..` を解決済みのため、正規化後の href が生成先ディレクトリ配下かだけを見れば足りる
  // （絶対パス・上位への相対パスはここで配下から外れる）。
  if (!target.href.startsWith(dataDirectory.href)) {
    throw new Error(`生成先が dataset_static_paths の外です: ${target.pathname}`);
  }
}

/** 削除 → 生成。冪等で、実行前の `seed/data/` の中身に依らず同じ結果になる。 */
async function generateDataset(): Promise<{ fingerprint: string; files: string[] }> {
  const { mkdir, rm, writeFile } = await import("node:fs/promises");
  if (!dataDirectory.pathname.endsWith("/seed/data/")) {
    throw new Error(`生成先の解決結果が想定と異なります: ${dataDirectory.pathname}`);
  }
  const files = serializeDataset();
  for (const path of files.keys()) {
    assertWithinDataDirectory(new URL(path, dataDirectory));
  }

  await rm(dataDirectory, { recursive: true, force: true });
  await mkdir(dataDirectory, { recursive: true });
  for (const [path, content] of files) {
    await writeFile(new URL(path, dataDirectory), content, "utf8");
  }
  return { fingerprint: fingerprintOf(files), files: [...files.keys()].toSorted() };
}

if (import.meta.main) {
  // 検証 → 生成の順に実行する（安定 ID・件数の検証に落ちる論理データを `seed/data/` へ書き出さないため）。
  const verified = verifyGoldenDataset();
  const generated = await generateDataset();
  process.stdout.write(`${JSON.stringify({ ...verified, ...generated })}\n`);
}
