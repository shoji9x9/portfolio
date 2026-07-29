// react-doctor 設定（https://react.doctor/docs）
// TypeScript 設定ファイル。`react-doctor` が起動時に読み込む（`.js/.mjs/.json` や
// package.json の `reactDoctor` キーより優先）。
// 本バージョンの react-doctor は型（ReactDoctorConfig）を公開していないため、
// 型注釈は付けずプレーンオブジェクトで記述する。
export default {
  // Socket.dev のサプライチェーンスキャンはネットワーク依存で不安定なため、
  // CI 安定性を優先して既定オフにする。ゲートスクリプトでも `--no-supply-chain` を渡す。
  // （サプライチェーン対策は mise `minimum_release_age` / pnpm `minimumReleaseAge` /
  //   Dependabot / license チェックで別途担保済み。AGENTS.md 参照）
  supplyChain: { enabled: false },

  ignore: {
    // 生成物・ビルド成果物・レポート（すべて .gitignore 済み）はスキャン対象外にする。
    //   - reports/**: jscpd 等が出力するレポート。特に
    //     reports/jscpd/html/js/prism.js は jsDelivr 由来の minified Prism.js バンドル
    //     で、dangerous-html-sink が誤検知していた。react-doctor 公式も
    //     「generated/minified bundle・syntax highlighter はスキップ対象」と明記。
    //     生成物であり自プロジェクトのソースではないため除外は妥当（誤検知の抑制）。
    //   - dist/** / coverage/**: ビルド・カバレッジ生成物。
    files: ["reports/**", "dist/**", "coverage/**", "**/*.d.ts"],

    overrides: [
      {
        // ルート直下のツール設定ファイルは各 CLI（knip / vite / oxlint / oxfmt /
        // commitlint / dependency-cruiser / react-doctor 自身）が読み込むエントリで、
        // アプリのエントリ `src/main.tsx` からは到達しない。deslop の unused-file は
        // これらを「未到達＝未使用」と誤検知するため、当該ファイルに限り unused-file
        // のみ抑制する（他ルールは有効のまま。誤検知の抑制）。
        files: [
          "*.config.ts",
          "*.config.js",
          "*.config.mjs",
          "knip.ts",
          "commitlint.config.js",
          "doctor.config.ts",
        ],
        rules: ["deslop/unused-file"],
      },
      {
        // テストは vitest が実行するエントリで `src/main.tsx` からは import されない。
        // unused-file の誤検知を防ぐ（他ルールは有効のまま残す）。
        files: ["**/*.{test,spec}.{ts,tsx}"],
        rules: ["deslop/unused-file"],
      },
      {
        // seed は `tsx` で直接実行するデータセット生成・検証ツールであり、アプリの
        // エントリから import されない。CLI エントリに限り unused-file を抑制する。
        files: ["seed/golden-dataset.ts"],
        rules: ["deslop/unused-file"],
      },
    ],
  },

  rules: {
    // oxlint-tailwindcss は oxlint.config.ts の `jsPlugins` に「文字列参照」で
    // 使用中（静的 import されないため deslop が未使用と誤検知）。実使用であり誤検知。
    // 未使用依存の検知は per-dependency ignore を持つ knip に委譲済み
    // （knip.ts の `ignoreDependencies`）。react-doctor の未使用依存ルールは
    // per-dependency 抑制手段が無く（`ignore.overrides` はファイル glob 単位で、
    // 依存の検出は package.json に紐づくため実質ルール全体の無効化になる）粒度不足かつ
    // knip と重複するため、dev / prod とも無効化する。
    "deslop/unused-dev-dependency": "off",

    // prod 側も同じ理由で無効化する。inter-ui は `src/index.css` の `@font-face` から
    // `url("inter-ui/...woff2")` で参照しており、JS/TS の import 解析だけを見る deslop は
    // 未使用と誤検知する。実使用は `pnpm build` の出力
    // （`dist/assets/Inter-roman.var-*.woff2`）とパリティスイートのフォント幅検査が担保する。
    "deslop/unused-dependency": "off",

    // require-pnpm-hardening は pnpm-workspace.yaml に `trustPolicy: no-downgrade` を
    // 追加するよう促す妥当なハードニング提案だが、現状これを追加すると pnpm 自身の
    // ロックファイル検証が失敗する:
    //     [ERR_PNPM_TRUST_DOWNGRADE] semver@6.3.1 High-risk trust downgrade
    //       (possible package takeover)
    // react-doctor は dead-code 解析で内部的に `pnpm install`（deps-status check）を
    // 走らせるため、trustPolicy を有効化すると react-doctor はもちろん CI の
    // `pnpm install` 自体が失敗する。解消には semver@6.3.1 の trust-downgrade 解決＝
    // ロックファイル再生成（`pnpm clean --lockfile` + `pnpm install`）が必要で、
    // pnpm-lock.yaml / package.json の変更・install 実行は本タスクのスコープ外。
    // よって「semver@6.3.1 を解決したうえで trustPolicy: no-downgrade を導入する」
    // 別対応（follow-up）に委ね、それまでは本ルールを無効化する（根拠付き抑制）。
    "react-doctor/require-pnpm-hardening": "off",
  },
};
