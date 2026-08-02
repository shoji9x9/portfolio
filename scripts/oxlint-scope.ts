/**
 * Oxlint と、Oxlint を補完する独自検査で共有するファイルスコープ。
 *
 * Oxlint は引数なしでリポジトリー全体の JavaScript / TypeScript 系ファイルを探索する。
 * 独自検査もこの定義を使い、対象追加・除外時に両者のスコープがずれないようにする。
 */
export const oxlintSourceGlobs = [
  "**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
  // `**/*` はルート直下のドットファイルに一致しないため、別パターンで補う。
  ".*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}",
];

export const oxlintIgnorePatterns = [
  "node_modules",
  "dist",
  ".agents",
  ".claude",
  ".wrangler",
  "coverage",
  "reports",
  "pnpm-lock.yaml",
  // parity-suite が配布する決定論的ツールのコピー（正本はスキル側）。
  // 外部スキルの成果物はこのリポジトリーで修正しない規約のため、整形・lint の対象外にする。
  "e2e/parity/lib/tools/vendor",
];
