// oxfmt 設定（https://oxc.rs/docs/guide/usage/formatter）
// TypeScript 設定ファイル。`vp fmt -c oxfmt.config.ts` で読み込む。
// 対象を自プロジェクト（src・ルートの設定/ドキュメント）に限定し、
// vendored な `.agents` / `.claude`（スキル実体）はスコープ外にする。
export default {
  fmt: {
    // gitignore 形式。設定ファイルのあるディレクトリを起点にマッチする。
    ignorePatterns: [
      "node_modules",
      "dist",
      ".agents",
      ".claude",
      ".config",
      ".wrangler",
      "coverage",
      "reports",
      "pnpm-lock.yaml",
    ],
    // Tailwind のクラス並び替えを維持する。
    sortTailwindcss: {
      stylesheet: "src/index.css",
      functions: ["clsx", "cn", "cva", "tw", "twMerge", "twJoin"],
    },
  },
};
