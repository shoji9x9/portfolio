# 品質チェック一覧

このプロジェクトで実行する静的解析・検査ツールと、実行タイミング（pre-commit / pre-push / CI）・
対象ファイルの一覧。設定の実体は各ツールの設定ファイル（`oxlint.config.ts` / `oxfmt.config.ts` /
`knip.ts` / `.dependency-cruiser.js` / `.markdownlint-cli2.mjs` / `lefthook.yml` / `.github/workflows/`）を参照。

## 実行タイミングの方針

- **pre-commit**: staged（変更）ファイル中心で高速に回す（lefthook）。
- **pre-push**: プロジェクト全体の重い検査（型・テスト・健全性・Actions 検査）。
- **CI**: 全体を多層で検査する。独立した検査群は並列ジョブに分割する。

## ツール × ステージ × 対象ファイル

| ツール                        | 目的                             | pre-commit               | pre-push | CI                                         | 対象ファイル                                                                   |
| ----------------------------- | -------------------------------- | ------------------------ | -------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| oxfmt                         | 整形                             | ✓ staged（自動再 stage） | –        | ✓ `format:check` 全体                      | `*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,json,jsonc,css}`（`.agents`/`.claude` 除外） |
| oxlint（type-aware）          | 静的解析                         | ✓ staged                 | –        | ✓ `lint` 全体                              | `*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}`（vendored 除外）                           |
| markdownlint-cli2             | Markdown 検査                    | ✓ staged                 | –        | ✓ 全体                                     | `*.md`（vendored 除外）                                                        |
| shfmt                         | シェル整形                       | ✓ staged                 | –        | ✓ `lint:sh` 内                             | `*.{sh,bash}`                                                                  |
| shellcheck                    | シェル静的解析                   | ✓ staged                 | –        | ✓ `lint:sh` 内                             | `*.{sh,bash}`                                                                  |
| gitleaks                      | 秘密情報検出                     | ✓ staged 差分            | –        | ✓ `secret-scan`（全履歴 `fetch-depth: 0`） | git 差分 / 全履歴                                                              |
| knip                          | 未使用 files/deps/exports        | ✓ 全体（関連 staged 時） | –        | ✓ 全体                                     | プロジェクト全体（entry `src/main.tsx`）                                       |
| dependency-cruiser            | 循環依存 / 依存規則              | ✓ src（関連 staged 時）  | –        | ✓                                          | `src/**`（※TS7 未対応で現状解析は限定的）                                      |
| jscpd                         | コピー&ペースト検出              | ✓ 全体（関連 staged 時） | –        | ✓                                          | `src` ほか                                                                     |
| commitlint                    | コミットメッセージ規約           | ✓ commit-msg             | –        | –                                          | コミットメッセージ                                                             |
| tsc                           | 型検査                           | –                        | ✓ 全体   | ✓                                          | tsconfig 対象（`src`・各 config）                                              |
| vitest                        | テスト                           | –                        | ✓ 全体   | ✓                                          | `*.{test,spec}.*`                                                              |
| react-doctor                  | React 健全性                     | –                        | ✓ 全体   | ✓                                          | `src`                                                                          |
| actionlint / ghalint / pinact | Actions 検査・SHA ピン           | –                        | ✓ 全体   | ✓（`actions-lint.yml`）                    | `.github/workflows/**`                                                         |
| pnpm audit signatures         | レジストリ署名検証               | –                        | –        | ✓（`supply-chain`）                        | 依存全体                                                                       |
| check-licenses.ts             | ライセンス（GPL/AGPL/SSPL 拒否） | –                        | –        | ✓（`supply-chain`）                        | 依存全体（`pnpm licenses`）                                                    |

## CI ジョブ構成（並列）

- `ci.yml`: `analyze`（静的解析）/ `verify`（型・テスト・ビルド・doctor）/ `supply-chain`（署名検証・ライセンス）/ `secret-scan`（全履歴）を並列実行。
- `actions-lint.yml`: `actionlint` + `ghalint` + `pinact --check`（`.github/workflows/**` 変更時）。
- `outdated.yml`: 週次で `mise outdated` を検出し Issue で通知。

## 備考

- lint は最初から厳格（ラチェットなし）。検出はすべて error として失敗させる。
- `.agents/` / `.claude/`（vendored スキル実体）は lint/format 対象外。
- `dependency-cruiser` は TypeScript 7 に未対応のため、現状は解析範囲が限定的（対応待ち）。
