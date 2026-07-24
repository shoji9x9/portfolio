// knip 設定（https://knip.dev）
// TypeScript 設定ファイル。`.json` より優先して読み込まれる。
// 本バージョンの knip（6.27.x）は `defineConfig` ヘルパーを公開しないため、
// 型注釈（`satisfies KnipConfig`）で型安全性を担保する。
import type { KnipConfig } from "knip";

export default {
  entry: ["src/main.tsx!"],
  project: ["src/**/*.{ts,tsx}"],
  ignore: ["**/*.d.ts"],
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
  //   - turbo: タスク実行/将来のモノレポ化のために保持（現状スクリプト未使用）
  //   - oxlint-tailwindcss: oxlint.config.ts の jsPlugins に文字列で指定（実使用）
  //   - react-doctor: scripts/react-doctor-gate.sh（shell）から呼ぶため静的検知不可
  ignoreDependencies: ["turbo", "oxlint-tailwindcss", "react-doctor"],
} satisfies KnipConfig;
