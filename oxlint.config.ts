// oxlint 設定（https://oxc.rs/docs/guide/usage/linter）
// TypeScript 設定ファイル。`vp lint -c oxlint.config.ts --type-aware` で読み込む。
// 型認識（type-aware）は CLI の `--type-aware` フラグで有効化する。
// リポジトリー全体の JavaScript / TypeScript 系ファイルを対象にし、vendored な
// `.agents` / `.claude`（スキル実体）はスコープ外にする。
import { oxlintIgnorePatterns } from "./scripts/oxlint-scope";

export default {
  lint: {
    // 対象を自プロジェクトに限定する（vendored スキル・生成物を除外）。
    ignorePatterns: oxlintIgnorePatterns,
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
    // 最初から厳格にする（ラチェットは使わない）。現状 warning だったものは
    // すべて error に格上げし、CI / フックで失敗させる。
    categories: {
      correctness: "error",
      suspicious: "error",
    },
    settings: {
      tailwindcss: {
        entryPoint: "src/index.css",
      },
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      // 循環的複雑度が 15 を超える関数は分割を検討する。
      complexity: ["error", 15],

      // 型システムの回避を封じる（自律エージェントが多用する `as any` / `: any` /
      // 非 null アサーション `!` / 非網羅 switch / Promise 誤用を error 化）。
      // これらは type-aware（--type-aware）で評価される。
      "typescript/no-explicit-any": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/no-misused-promises": "error",
      "typescript/switch-exhaustiveness-check": "error",

      // 循環依存・重複 import を担保する（dependency-cruiser は TypeScript 7 未対応で
      // 実質無効のため oxlint で代替）。未解決 import は tsc が検出する。
      // import/order・import/no-unresolved は現行 oxlint 未実装のため設定しない。
      "import/no-cycle": "error",
      "import/no-duplicates": "error",

      // 新 JSX 変換（自動 runtime）のため React のスコープ内参照は不要。
      // src/main.tsx / src/App.tsx での誤検出を無効化する。
      "react/react-in-jsx-scope": "off",

      // react-hooks 相当のルールを明示的に有効化する。
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // CSS などの副作用 import（`import "./index.css"`）は許可する。
      "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],

      "tailwindcss/no-unknown-classes": "error",
      "tailwindcss/no-conflicting-classes": "error",
      "tailwindcss/no-contradicting-variants": "error",
      "tailwindcss/no-deprecated-classes": "error",
      "tailwindcss/no-duplicate-classes": "error",
      "tailwindcss/no-unnecessary-whitespace": "error",
      "tailwindcss/enforce-canonical": "error",
      "tailwindcss/enforce-shorthand": "error",
      "tailwindcss/no-unnecessary-arbitrary-value": "error",
      "tailwindcss/consistent-variant-order": "error",
      "tailwindcss/enforce-consistent-important-position": "error",
      "tailwindcss/enforce-consistent-variable-syntax": "error",

      // 並び替えは oxfmt に一元化するため lint 側は無効のまま。
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
      {
        // パリティスイート（Playwright）は React を含まない。Playwright のフィクスチャ引数名
        // `use` を react-hooks が Hook 呼び出しと誤検出するため、当該ルールを無効化する。
        files: ["e2e/**"],
        rules: {
          "react-hooks/rules-of-hooks": "off",
          "react-hooks/exhaustive-deps": "off",
        },
      },
      {
        // テストは cn() の挙動確認のため意図的にダミー/衝突クラスを渡すので、
        // Tailwind クラスの妥当性・衝突検査を無効化する。
        files: ["**/*.{test,spec}.{ts,tsx}"],
        rules: {
          "tailwindcss/no-unknown-classes": "off",
          "tailwindcss/no-conflicting-classes": "off",
        },
      },
    ],
  },
};
