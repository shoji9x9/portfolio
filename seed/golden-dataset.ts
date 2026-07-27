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
    "GitHub",
    "https://github.com/shoji9x9",
    "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=github&logoColor=white",
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
    "tailwindcss",
    "TailwindCSS",
    "https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white",
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
    "azure",
    "Azure",
    "https://img.shields.io/badge/Microsoft_Azure-0089D6?style=for-the-badge&logo=microsoft-azure&logoColor=white",
  ],
  [
    "vercel",
    "Vercel",
    "https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white",
  ],
  [
    "github-actions",
    "GitHubActions",
    "https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white",
  ],
]);

const projects: Project[] = [
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
      projectIds: ["freelance-sales", "freelance-construction"],
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
    {
      id: "portfolio",
      title: "ポートフォリオ（このページ）",
      url: "https://shoji9x9.github.io/",
      repositoryUrl: "https://github.com/shoji9x9/shoji9x9.github.io",
      article: {
        title: "GitHub PagesにNext.jsでポートフォリオ作ってみた",
        url: "https://zenn.dev/shoji9x9/articles/90897d3f772e8a",
      },
      techStack: ["React", "TypeScript", "NextJS", "TailwindCSS", "GitHubActions"],
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
      "また、これらのプロジェクトの上流～下流の各局面の成果物のレビューを行い、時には自身で成果物を作成してきました (Java、COBOLがメイン)",
      "日頃より現状に課題意識を持ちOutSystemsやアジャイル (Scrum、SAFe) の情報を集めプロジェクトに導入してきた行動力も特徴の一つと考えます",
      "今後はこれまで培ってきた経験を活かしながらも、製品やサービスの開発を行っていきたいと考えており、特にフロントエンド開発 (Reactやコンポーネント駆動開発) への関心が高いです",
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
    desiredWorkUrl: "https://zenn.dev/shoji9x9/articles/741bba963942a6",
  },
  lapras: {
    publicUrl: "https://lapras.com/public/shoji9x9",
    preview: "gap: linkpreview.net の秘密鍵を要するレスポンスは収録しない",
  },
} as const;

export function canonicalJson(): string {
  return JSON.stringify(goldenDataset);
}

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
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
  if (projectsCount !== 6) {
    throw new Error("職務経歴の件数が現行ソースと一致しません。");
  }
  return {
    fingerprint: fingerprint(canonicalJson()),
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

if (import.meta.main) {
  console.error(JSON.stringify(verifyGoldenDataset()));
}
