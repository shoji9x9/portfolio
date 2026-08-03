# 品質チェック一覧

このプロジェクトで実行する静的解析・検査ツールと、実行タイミング（pre-commit / pre-push / CI）・
対象ファイルの一覧。設定の実体は各ツールの設定ファイル（`oxlint.config.ts` / `oxfmt.config.ts` /
`knip.ts` / `.markdownlint-cli2.mjs` / `lefthook.yml` / `.github/workflows/`）を参照。

## 実行タイミングの方針

- **pre-commit**: staged（変更）ファイル中心で高速に回す（lefthook）。
- **pre-push**: プロジェクト全体の重い検査（型・テスト・健全性・Actions 検査）。
- **CI**: 全体を多層で検査する。独立した検査群は並列ジョブに分割する。

## ツール × ステージ × 対象ファイル

| ツール                         | 目的                             | pre-commit               | pre-push | CI                                         | 対象ファイル                                                                                         |
| ------------------------------ | -------------------------------- | ------------------------ | -------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| oxfmt                          | 整形                             | ✓ staged（自動再 stage） | –        | ✓ `format:check` 全体                      | `*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,json,jsonc,css}`（`.agents`/`.claude` 除外）                       |
| oxlint（type-aware）           | 静的解析・循環的複雑度           | ✓ staged                 | –        | ✓ `lint` 全体                              | `*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}`（vendored 除外）                                                 |
| Tailwind canonical 検査        | 非 canonical クラス名の検出      | ✓ 全体（関連 staged 時） | –        | ✓ `lint` 内                                | oxlint と同じ `*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}`（vendored・生成物等を除外）                        |
| markdownlint-cli2              | Markdown 検査                    | ✓ staged                 | –        | ✓ 全体                                     | `*.md`（vendored 除外）                                                                              |
| shfmt                          | シェル整形                       | ✓ staged                 | –        | ✓ `lint:sh` 内                             | `*.{sh,bash}`                                                                                        |
| shellcheck                     | シェル静的解析                   | ✓ staged                 | –        | ✓ `lint:sh` 内                             | `*.{sh,bash}`                                                                                        |
| gitleaks                       | 秘密情報検出                     | ✓ staged 差分            | –        | ✓ `secret-scan`（全履歴 `fetch-depth: 0`） | git 差分 / 全履歴                                                                                    |
| knip                           | 未使用 files/deps/exports        | ✓ 全体（関連 staged 時） | –        | ✓ 全体                                     | `src` / `functions` / `e2e` / `scripts` / `seed` / `playwright.config.ts`（CLI は entry として宣言） |
| jscpd                          | コピー&ペースト検出              | ✓ 全体（関連 staged 時） | –        | ✓                                          | `src` / `functions` / `e2e`（`*.test.*` / `*.spec.*` / vendored は除外）                             |
| commitlint                     | コミットメッセージ規約           | ✓ commit-msg             | –        | –                                          | コミットメッセージ                                                                                   |
| tsc                            | 型検査                           | –                        | ✓ 全体   | ✓                                          | tsconfig 対象（`src` / `functions` / `e2e`＋`playwright.config.ts` / 各 config・`scripts`・`seed`）  |
| vitest                         | テスト                           | –                        | ✓ 全体   | ✓                                          | `src/**` / `functions/**` / `seed/**` の `*.{test,spec}.{ts,tsx}`（`e2e` は対象外）                  |
| Playwright（パリティスイート） | 現行／新側の等価性検証           | –                        | –        | –（手動実行）                              | `e2e/parity/**/*.spec.ts`                                                                            |
| Playwright（Preview smoke）    | 実 API・画像・ブラウザー表示確認 | –                        | –        | ✓ Preview デプロイ直後                     | `e2e/preview/**/*.spec.ts`                                                                           |
| react-doctor (`react:doctor`)  | React 健全性                     | –                        | ✓ 全体   | ✓                                          | `src`                                                                                                |
| actionlint / ghalint / pinact  | Actions 検査・SHA ピン           | –                        | ✓ 全体   | ✓（`actions-lint.yml`）                    | `.github/workflows/**`                                                                               |
| pnpm audit signatures          | レジストリ署名検証               | –                        | –        | ✓（`supply-chain`）                        | 依存全体                                                                                             |
| check-licenses.ts              | ライセンス（GPL/AGPL/SSPL 拒否） | –                        | –        | ✓（`supply-chain`）                        | 依存全体（`pnpm licenses`）                                                                          |
| Dependency Review              | 依存差分の脆弱性・ライセンス     | –                        | –        | ✓（依存マニフェスト変更 PR）               | `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`                                            |

## CI ジョブ構成

- `ci.yml`: `check` ジョブが各チェック（format/lint/typecheck/test/build/knip/jscpd/react:doctor/署名検証/ライセンス）を
  **ネイティブの step 並列（`parallel:`）** で実行し、`secret-scan` ジョブ（全履歴 gitleaks）を並列実行。
  ※ `parallel:` は actionlint 未対応のため `.github/actionlint.yaml` で ci.yml のみ該当メッセージを ignore。
- `actions-lint.yml`: `actionlint` + `ghalint` + `pinact --check`（`.github/workflows/**` 変更時）。
- `outdated.yml`: 週次で `mise outdated` を検出し Issue で通知。
- `dependency-review.yml`: 依存マニフェスト変更 PR の既知脆弱性・拒否ライセンスを検査する。拒否ライセンスは `.github/license-policy.json` を正本としてローカル検査と共有する。
- `dependabot-automerge.yml`: 対象の Dependabot PR が CI と Dependency Review を通過した場合だけ merge commit で自動マージする。

## パリティスイート（Playwright）の実行

移行の等価性検証（`parity-suite` / `parity-replace` / `parity-diff`）で使う。URL は設定
（`.config/skills/shoji9x9/skills.yml` の `targets`）から解決して環境変数で渡す。設定ファイルに
URL を直書きしない。

```bash
# 現行（current-prod）に対して全件実行
PARITY_CURRENT_UI_URL=https://shoji9x9.github.io/ pnpm exec playwright test --project=current

# ベースライン採取とノイズ基準値の測定（.replace/parity/<slug>/baseline/ を作り直す）
PARITY_CURRENT_UI_URL=<url> pnpm exec playwright test --project=current e2e/parity/static-page/baseline.spec.ts
```

ブラウザーの導入は `pnpm exec playwright install chromium`（`pnpm install` では入らない）。
CI では実行しない（現行サイト・外部画像 CDN への到達性に依存し、外部要因で不安定になるため）。

### ベースライン採取ブラウザーの陳腐化ガード

視覚ベースラインは採取に使ったブラウザーの描画結果そのもので、現行側と新側で Chromium が
食い違うと実装差ではない差分が出る。採取条件は `.replace/parity/<slug>/metadata.json` の
`capture_conditions.browser`（`engine` / `playwright_version` / `browser_version`）に機械可読で
記録し、採取・照合の実行時に実行中のバージョンと突き合わせる（`e2e/parity/lib/browser-version.ts`）。
検査するのは現行側の採取（`baseline.spec.ts`）・強度ゲート（`strength.spec.ts`）と、
新側の採取（`baseline-new.spec.ts`）で、不一致なら採り直しの手順を示して失敗する。

**この一致を CI で検査してはいけない。** CI に置くと Playwright の更新 PR 自体が赤くなり、
更新のたびに全機能のベースライン再採取を強制することになる。Playwright は通常の依存更新として
上げてよく、再採取のコストは次にパリティ比較を行う機能の分だけ、ガードが告げた時点で払う。

## Preview スモークテスト

Cloudflare Pages の Preview デプロイ直後に `deploy.yml` が自動実行する。パリティスイートの固定レスポンスは
使わず、デプロイ固有 URL に対して実際の Pages Function・LAPRAS 公開ページ・
プレビュー画像を Chromium で確認する。ローカルから同じ確認を行う場合は次のように実行する。

```bash
PREVIEW_UI_URL=<deployment-url> pnpm run test:preview
```

外部ページを利用するため通常の CI には含めず、対象 Preview を作成した `Deploy / Preview` ジョブだけで実行する。

### local-production を検証するとき

`local-production` の `pre_commands` は、v1.30.1 以降、`check_urls` が失敗したときだけ実行される。ソースを変更した後に既存の preview サーバーが稼働している場合は、先に停止してから `local-production` の検証を開始する。これにより `pnpm build` が実行され、古い `dist/` を検証対象にしない。

## 新しいファイル種別を追加するときの確認

リポジトリーへ新しい種類のファイル・ディレクトリ（生成物・採取物・CLI・スクリプト・E2E など）を
足したら、品質チェック各ツールの対象範囲を**両方向**で確認してから追加を完了する。ズレは 2 方向で
起きる——「対象にすべきなのに外れている」（テスト・デッドコード検出・型検査）と、「対象にすべきで
ないのに入っている」（生成物の整形）。

- **生成物・採取物は整形・lint の対象外にする**。整形すると生成ツールの出力と食い違い、再生成の
  たびに差分が出る。書式の正本は生成ツールに一本化し、代わりに「再生成しても差分ゼロ」を
  決定論的に検証するテストを置く（例: `seed/data/` と `seed/golden-dataset.test.ts`）。
- **vendored（外部スキル配布物のコピー）は整形・lint・knip の対象外にする**。このリポジトリーで
  修正しない規約のため（例: `e2e/parity/lib/tools/vendor/`）。
- **整形の対象に入れたら、整形後の差分まで確認して完了とする**。自分が書いた形のまま残る前提で
  判断しない。とくに oxfmt の `sortImports` は**コメントを直後の import 文に付随させて一緒に
  並び替える**ため、ファイル冒頭のモジュール説明コメントは「並び替え後に先頭へ来る import」
  （型 import があればその先頭）の直前へ置く。値 import の直前に書くと、その import が型グループの
  後ろへ移る際にコメントも運ばれ、ファイル先頭が `import` 行になる。

- **JS/TS の import 解析を通らない依存は、未使用依存を見るツール「すべて」で確認する**。CSS の
  `url()` や設定ファイルの文字列参照で使う依存は、静的 import が無いため未使用と誤検知される。
  1 つのツールで抑制しても他のツールが同じ理由で落ちる（`inter-ui` は knip で抑制した後に
  react-doctor の pre-push ゲートで再び落ちた）。依存を足したら、未使用依存を見るツールを洗い出して
  まとめて確認する（現状は knip と react-doctor の 2 つ）。抑制するときは実使用の証拠
  （ビルド成果物・テスト）を併記する。

現状の分類:

| 種別                    | 例                             | oxfmt / oxlint | tsc | vitest                    | knip            | jscpd          |
| ----------------------- | ------------------------------ | -------------- | --- | ------------------------- | --------------- | -------------- |
| アプリコード            | `src/`                         | ✓              | ✓   | ✓                         | ✓               | ✓              |
| Pages Functions         | `functions/`                   | ✓              | ✓   | ✓                         | ✓               | ✓              |
| E2E（パリティスイート） | `e2e/`                         | ✓              | ✓   | –                         | ✓               | ✓（spec 除く） |
| CLI スクリプト          | `scripts/`                     | ✓              | ✓   | –                         | ✓（entry 宣言） | –              |
| 生成ツール              | `seed/*.ts`                    | ✓              | ✓   | ✓                         | ✓（entry 宣言） | –              |
| 生成物                  | `seed/data/`                   | –              | –   | –（生成一致テストで担保） | –               | –              |
| 採取物                  | `.replace/parity/`             | –              | –   | –                         | –               | –              |
| vendored ツール         | `e2e/parity/lib/tools/vendor/` | –              | ✓   | –                         | –               | –              |

## 備考

- lint は最初から厳格（ラチェットなし）。検出はすべて error として失敗させる。
- Tailwind canonical 検査は Tailwind 本体の抽出器と `canonicalizeCandidates()` を使う。
  `oxlint-tailwindcss` の事前計算一覧に含まれない動的数値クラスも対象になり、たとえば
  `w-192` は `w-3xl` を提示して失敗する。
  対象 glob と除外パターンは `scripts/oxlint-scope.ts` を oxlint と共有する。
- `.agents/` / `.claude/`（vendored スキル実体）は lint/format 対象外。
- 循環依存は oxlint `import/no-cycle` で検査する（dependency-cruiser は TypeScript 7 未対応のため撤去）。
- 関数の循環的複雑度は oxlint `complexity`（上限 15）で検査する。
