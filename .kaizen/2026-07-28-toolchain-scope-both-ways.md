---
date: 2026-07-28
type: doc
priority: high
status: applied
session: claude-code
---

# リポジトリーへ新種のファイルを足したら品質チェック各ツールのスコープを両方向で確認する

## 事象

`seed/data/` へゴールデンデータセットの生成 JSON を追加したが、oxfmt の対象（`*.json`）に
入るため生成ツールの出力と整形結果が食い違った。生成直後は `format:check` が 3 ファイルで
失敗し、pre-commit で整形されると再生成のたびに差分が出る。自分の品質チェックでは気づかず、
/code-review の指摘で発覚した。

同じセッションで追加した `scripts/preview-url.mjs` も、knip の `project`（`src/**/*.{ts,tsx}`）と
vitest の `include`（`src/**`・`seed/**`）のどちらにも入っていない。デッドコード検出も
テストも効いていない（`seed/golden-dataset.ts` の `canonicalJson()` がデッドコード化しても
knip が検出せず、レビューまで残った）。

## 根本原因

ファイルを追加するとき、自分の変更が既存チェックを通るかは確認したが、**既存ツールが追加物をどう
扱うか**を確認していなかった。スコープのズレは 2 方向で起きる——「対象にすべきなのに外れている」
（テスト・デッドコード検出）と「対象にすべきでないのに入っている」（生成物の整形）。

同型の失敗は 2026-07-27 にも起きている（`seed/` のテストが vitest の `include` 外で検出されなかった）。
そのときの対策は `vite.config.ts` の設定修正に留まり、「追加時にスコープを確認する」という規律自体が
恒久的な置き場に書かれなかったため再発した。

## 提案

リポジトリーへ新しい種類のファイル・ディレクトリ（生成物・CLI・スクリプト等）を追加したら、
品質チェック各ツールの対象範囲を「対象になるべきか」の両方向で確認してから追加を完了する。
生成物は整形・lint の対象外にし、代わりに「再生成しても差分ゼロ」を決定論的に検証するテストを
置く（整形と生成の二重管理を避ける）。

反映先: `docs/quality-checks.md` に「新しいファイル種別を追加するときの確認」節を追記し、
`seed/data/`（整形対象外・再生成一致テストで担保）と `scripts/`（knip・vitest のスコープ外）の
現状を表へ反映する。

## 適用（2026-07-28、Issue #22 のパリティスイート構築時）

散文の規律だけでは確率的にしか守られないため、**ドキュメント（規律）と機構（決定論的な検出）の
両方**へ反映した。

### 1. 規律をドキュメントへ

`docs/quality-checks.md` に「新しいファイル種別を追加するときの確認」節を追加し、両方向の確認・
生成物の扱い・vendored の扱いと、種別ごとの現状分類表（`src` / `e2e` / `scripts` / `seed` /
`seed/data` / `.replace/parity` / vendored × oxfmt・tsc・vitest・knip・jscpd）を置いた。

### 2. 機構へ（学びが挙げた `scripts/` のスコープ外を実際に塞いだ）

- knip: `project` に `scripts/**` と `seed/**` を追加し、import されず起動される CLI
  （`scripts/*.{ts,mjs}`・`seed/golden-dataset.ts`）を `entry` として宣言した。
  これにより `seed/golden-dataset.ts` の `generateDataset` が**同一ファイル内でしか使われない
  不要な export** であることを knip が検出し、解消した（学びが挙げた `canonicalJson()` と同型）。
- 本 Issue で追加した新種のディレクトリー `e2e/`（パリティスイート）は、追加時点で両方向を確認した。
  - 対象に入れた: tsc（`tsconfig.e2e.json` を新設し `tsconfig.json` から参照）・oxlint・oxfmt・knip・jscpd
  - 対象から外した: vitest（Playwright スペックは vitest で実行しない。`include` が
    `src/**`・`seed/**` の許可リストのため既に対象外であることを確認）
  - 採取物 `.replace/parity/` と vendored ツール `e2e/parity/lib/tools/vendor/` は
    oxfmt・oxlint・knip・jscpd の対象外にした（`seed/data/` と同じ理由）。

### 残した課題

`scripts/` と `seed/*.ts` は vitest・jscpd の対象外のまま。CLI にテストを課す方針を決めていないため、
現状として分類表に記録するに留めた（対象にすべきと判断したら別途扱う）。
