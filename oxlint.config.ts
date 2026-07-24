// oxlint 設定（https://oxc.rs/docs/guide/usage/linter）
// TypeScript 設定ファイル。`vp lint -c oxlint.config.ts --type-aware` で読み込む。
// 型認識（type-aware）は CLI の `--type-aware` フラグで有効化する。
// ルート直下の設定/ドキュメントと `src` のみを対象にし、vendored な
// `.agents` / `.claude`（スキル実体）はスコープ外にする。
export default {
  lint: {
    // 対象を自プロジェクトに限定する（vendored スキル・生成物を除外）。
    ignorePatterns: [
      "node_modules",
      "dist",
      ".agents",
      ".claude",
      ".wrangler",
      "coverage",
      "reports",
      "pnpm-lock.yaml",
    ],
    plugins: [
      "typescript",
      "unicorn",
      "oxc",
      "react",
      // react-hooks（rules-of-hooks / exhaustive-deps）を補完する。
      "react-hooks",
      // react のレンダリング性能ルールを補完する。
      "react-perf",
      "jsx-a11y",
      "import",
      "promise",
    ],
    jsPlugins: ["oxlint-tailwindcss"],
    categories: {
      correctness: "error",
      suspicious: "warn",
    },
    settings: {
      tailwindcss: {
        entryPoint: "src/index.css",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],

      // 新 JSX 変換（自動 runtime）のため React のスコープ内参照は不要。
      // src/main.tsx / src/App.tsx での誤検出を無効化する。
      "react/react-in-jsx-scope": "off",

      // react-hooks 相当のルールを明示的に有効化する。
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // CSS などの副作用 import（`import "./index.css"`）は許可する。
      "import/no-unassigned-import": ["warn", { allow: ["**/*.css"] }],

      "tailwindcss/no-unknown-classes": "error",
      "tailwindcss/no-conflicting-classes": "error",
      "tailwindcss/no-contradicting-variants": "error",
      "tailwindcss/no-deprecated-classes": "error",

      "tailwindcss/no-duplicate-classes": "warn",
      "tailwindcss/no-unnecessary-whitespace": "warn",
      "tailwindcss/enforce-canonical": "warn",
      "tailwindcss/enforce-shorthand": "warn",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
      "tailwindcss/consistent-variant-order": "warn",
      "tailwindcss/enforce-consistent-important-position": "warn",
      "tailwindcss/enforce-consistent-variable-syntax": "warn",

      "tailwindcss/enforce-sort-order": "off",
    },
    overrides: [
      {
        // CLI スクリプト（ライセンスチェック等）は標準出力への出力が本質なので
        // no-console を許可する。
        files: ["scripts/**"],
        rules: {
          "no-console": "off",
        },
      },
    ],
  },
};
