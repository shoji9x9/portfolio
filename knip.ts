// knip 設定（https://knip.dev）
// TypeScript 設定ファイル。`.json` より優先して読み込まれる。
// 本バージョンの knip（6.27.x）は `defineConfig` ヘルパーを公開しないため、
// 型注釈（`satisfies KnipConfig`）で型安全性を担保する。
import type { KnipConfig } from "knip";

export default {
  // パリティスイート（Playwright）は src とは別のエントリー系統。スペックと設定を入口にして、
  // ロケータマッピング・判定・採取ツールのデッドコードを検出できるようにする。
  // 決定論的ツール（`e2e/parity/lib/tools/*.mjs`）は CLI としても実行するためエントリーに含める
  // （VERSION / main は CLI と metadata.json の記録に使う契約で、静的な参照は現れない）。
  // CLI スクリプトとゴールデンデータセット生成ツールもエントリーに含める。
  // いずれも import されず、package.json の scripts・ワークフロー・スキル設定
  // （`.config/skills/shoji9x9/skills.yml` の `url_command`）から起動される。
  entry: [
    "src/main.tsx!",
    "playwright.config.ts",
    "e2e/**/*.spec.ts",
    "e2e/parity/lib/tools/*.mjs",
    "scripts/**/*.{ts,mjs}",
    "seed/golden-dataset.ts",
  ],
  project: [
    "src/**/*.{ts,tsx}",
    "e2e/**/*.{ts,mjs}",
    "playwright.config.ts",
    "scripts/**/*.{ts,mjs}",
    "seed/**/*.ts",
  ],
  ignore: [
    "**/*.d.ts",
    // parity-suite が配布する決定論的ツールのコピー（正本はスキル側。修正しない規約）。
    // CLI としても使えるよう未使用の export（VERSION・main など）を持つため対象外にする。
    "e2e/parity/lib/tools/vendor/**",
  ],
  // mise / vite+ 由来の外部バイナリ（pnpm 依存ではない）は未登録として扱わない。
  ignoreBinaries: [
    "vp",
    "gitleaks",
    "shfmt",
    "shellcheck",
    "actionlint",
    "ghalint",
    "pinact",
    "mise",
    "wrangler",
  ],
  // knip が用途を静的検知できない依存を保持する。
  //   - oxlint-tailwindcss: oxlint.config.ts の jsPlugins に文字列で指定（実使用）
  //   - react-doctor: scripts/react-doctor-gate.sh（shell）から呼ぶため静的検知不可
  ignoreDependencies: ["oxlint-tailwindcss", "react-doctor"],
} satisfies KnipConfig;
