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
      // ゴールデンデータセットの生成物。整形すると `seed/golden-dataset.ts` の決定論的な出力と
      // 食い違い、再生成のたびに差分が出るため対象外にする（正本は生成ツール）。
      "seed/data",
      // ゴールデンデータセット フェーズ B の生成物（新側への写像結果）。同じ理由で対象外にする。
      "src/data/generated",
      // パリティスイートの採取物（特性 JSON・ノイズ基準値・強度ゲート結果）。同じ理由で対象外にする
      // （正本は採取ツール。整形すると再採取のたびに差分が出る）。`.replace/` の手書きドキュメントは対象。
      ".replace/parity",
      // parity-suite が配布する決定論的ツールのコピー（正本はスキル側）。
      // 外部スキルの成果物はこのリポジトリーで修正しない規約のため、整形の対象外にする。
      "e2e/parity/lib/tools/vendor",
    ],
    // import 文のグルーピング + 並び替え（ESLint 不要。oxfmt が
    // eslint-plugin-perfectionist/sort-imports 相当のアルゴリズムで整列する）。
    //   型 import → Node ビルトイン → 外部 → 内部エイリアス(@/**) → 相対 → 副作用。
    sortImports: {
      groups: [
        "type",
        "builtin",
        "external",
        "internal",
        ["parent", "sibling", "index"],
        "side_effect",
        "unknown",
      ],
      internalPattern: ["@/"],
      order: "asc",
    },
    // Tailwind のクラス並び替えを維持する。
    sortTailwindcss: {
      stylesheet: "src/index.css",
      functions: ["clsx", "cn", "cva", "tw", "twMerge", "twJoin"],
    },
  },
};
