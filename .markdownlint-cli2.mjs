// markdownlint-cli2 設定（https://github.com/DavidAnson/markdownlint-cli2）
// markdownlint-cli2 は `.ts` 設定に非対応のため ESM（`.mjs` / `export default`）で記述する。
export default {
  config: {
    default: true,
    // 行長制限は無効（日本語ドキュメント・URL を含むため）
    MD013: false,
    // インライン HTML を許可（ドキュメント内の補助的なマークアップ用）
    MD033: false,
    // 先頭見出しの強制を無効化
    MD041: false,
    // 順序なしリストのマーカーを "-" に統一
    MD004: { style: "dash" },
    // 見出し重複はネスト内でのみ許容
    MD024: { siblings_only: true },
  },
  globs: ["**/*.md"],
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.wrangler/**",
    "**/reports/**",
    // Playwright の失敗時に生成される error-context.md はテスト成果物なので検査しない。
    "**/test-results/**",
    "**/CHANGELOG.md",
    "**/pnpm-lock.yaml",
    // vendored なスキル実体（自プロジェクト外）はスコープ外にする。
    "**/.agents/**",
    "**/.claude/**",
  ],
};
