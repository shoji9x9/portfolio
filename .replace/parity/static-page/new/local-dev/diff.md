# 差分レポート（diff）

- 対象 slug: `static-page`
- 対象 target: `local-dev`（<http://localhost:5173>）
- モード: feature
- 実施日時: 2026-07-29T07:55:00+09:00（反復 1 の修正後に再検出: 2026-07-29T08:55:00+09:00、v1.34.0 契約で再検証: 2026-07-31T10:22:03+09:00）
- 読んだ同 target の `replace-metadata.json` の `loop.iterations`: 0 → 反復 1 の修正を受けて再検出済み

## 1. 前提確認の結果

| 前提                                        | 確認値                                                                                                                         | 判定 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---- |
| replace-strategy setup（設定・features.md） | あり                                                                                                                           | OK   |
| target の起動・稼働確認                     | `start: pnpm dev` を実行し `http://localhost:5173/` の稼働を確認（`pre_commands` 無し）                                        | OK   |
| parity-suite 完了                           | `suite.current_green: true` / `differ.validated_by_strength_gate: true` / `noise_baseline` 6 組 / `baseline/` の実体あり       | OK   |
| parity-replace 新側 green                   | `suite.new_green: true` / `new.target: local-dev`（一致）                                                                      | OK   |
| データセットバージョン三者一致              | 2 / 2 / 2                                                                                                                      | 一致 |
| 条件一致検証                                | 下表のとおり（`environment` は unverified）                                                                                    | OK   |
| 新側の自己ノイズ                            | 全 6 組で `pixel_diff: 0` / `trait_diffs: 0`（現側と同値）。全組 measured（初回実行のため再利用元なし）                        | OK   |
| 差分器バージョン一致                        | trait-capture v1 / trait-compare v1 / pixel-compare v1（pixelmatch 7.2.0・threshold 0.1）/ aria-compare v1 / align_tolerance 1 | 一致 |

### 条件一致検証（5 項目）

| 項目          | 結果                                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewports`   | 一致（desktop 1280x900 / mobile 390x844）                                                                                                                                  |
| `animations`  | 一致（`animations: "disabled"` を新側でも適用）                                                                                                                            |
| `masks`       | 一致（AtCoder バッジ・LAPRAS セクションのロケータは新側でも解決。ただし新側に LAPRAS セクションは存在せずマスク対象が 0 件）                                               |
| `states`      | 一致（default / hover / focus へ操作アダプタで遷移）                                                                                                                       |
| `environment` | `unverified: 現側は自由記述で機械照合できない。両側とも Linux(WSL) の Chromium・devicePixelRatio 1・colorScheme light で撮影したが、利用者の閲覧環境（Windows）とは異なる` |

## 2. 経路別サマリ

| 経路     | 適用したノイズ基準値                            | 検出件数                                                      | 備考                                                          |
| -------- | ----------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 画素     | `/` × default × {desktop, mobile}（いずれも 0） | 差分領域 12（desktop 3・mobile 9）                            | フルページは高さが 483px 違うため共通部分へ切り揃えて比較した |
| 特性照合 | 同上（0）                                       | default: desktop 633・mobile 632／hover・focus: 各 15（4 組） | `align_tolerance 1` を明示指定                                |
| aria     | —                                               | 生 256 行 → 宣言済み差異の正規化後 7 行                       | 補助経路                                                      |

- 画素経路のフルページ比較は、現側 6516px / 新側 6033px（desktop）と高さが違うため、**現側を新側の高さへ切り揃えて**比較した。差の 483px は LAPRAS セクション（見出し 96px ＋ 本体 ＋ `mb-8`）で、機能 `lapras`（Issue #23）の担当範囲。
- 状態別（hover / focus）の特性照合は**要素ごとに**比較した。採取時に要素を 1 つずつ hover するとスクロール位置が動き、要素対の相対幾何が採取順の副作用で変わるため。
  この副作用は現側ベースラインにも乗っているが、**同じ量ではない**。LAPRAS が現行ページの最終セクションであるため、その不在は「希望条件より下に残るスクロール余地」を 483px 減らし、
  最終セクションのリンクを `scrollIntoView` したときのビューポート内位置が現新でずれる（`preview` の検証時に実測。`new/preview/diff.md` の 4 節）。要素そのものは画素まで一致しており、描画の差ではない。

## 3. 差分一覧

| ID  | 経路     | ページ | 状態    | ビューポート | 位置                                                                                        | 内容                                                                                                    | 正規化結果                         | 分類             | 根拠                                                                                                                     |
| --- | -------- | ------ | ------- | ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | 特性照合 | `/`    | 全状態  | 両方         | 全論理名（136＋各状態 3）                                                                   | `font-family` の値が違う（`__Inter_e66fe9, __Inter_Fallback_e66fe9` → `"Inter var", "Inter Fallback"`） | unexplained                        | **要対応**       | 実体は同じ Inter 3.019 のヒンティング無しビルドで、幅は実測一致。名前の違いを `component_diffs` として宣言していない     |
| 2   | 特性照合 | `/`    | 全状態  | 両方         | 124 論理名 × 4 プロパティ（＋各状態 3×4）                                                   | `border-*-color` が `rgb(229,231,235)` → `rgb(0,0,0)`                                                   | unexplained                        | **要対応**       | Tailwind v3 preflight の既定境界色と v4 の `currentColor` の差。対象要素はいずれも `border-width: 0` で描画には出ない    |
| 3   | 画素     | `/`    | default | desktop      | `careers.project.toyota-outsystems.heading` の 2 箇所 bbox(189,3096)・bbox(237,3096) 各 3px | 文字の輪郭画素の濃度が数段階違う（位置は一致）                                                          | unexplained                        | **原因未特定**   | 下記「微小残差の調査」                                                                                                   |
| 4   | 画素     | `/`    | default | mobile       | 7 箇所・計 11px（自己 PR 1・職務経歴 4・資格 2）                                            | 同上                                                                                                    | unexplained                        | **原因未特定**   | 下記「微小残差の調査」                                                                                                   |
| 5   | 画素     | `/`    | default | desktop      | bbox(96,5937) 1088x96 / 104,448px                                                           | 現側に LAPRAS セクションの見出し（マスク領域）があり新側に無い                                          | —                                  | スコープ外       | 機能 `lapras`（Issue #23）の担当                                                                                         |
| 6   | 画素     | `/`    | default | mobile       | bbox(96,9726) 198x96 ＋ bbox(626,9792) 33x30 / 計 18,976px                                  | 同上                                                                                                    | —                                  | スコープ外       | 同上                                                                                                                     |
| 7   | 特性照合 | `/`    | default | desktop      | `page.main \                                                                                | careers.project.toyota-outsystems.heading`                                                              | 相対幾何 `vertical` が `gt` → `lt` | unexplained      | スコープ外                                                                                                               |
| 8   | aria     | `/`    | default | 両方         | link/img "Github" ×2・img "GithubActions" ×2                                                | 表示名が `GitHub` / `GitHub Actions` へ                                                                 | absorbed_registry                  | 許容（宣言済み） | `intentional_diffs.may_change`「GitHub の綴りの是正（新側のみ）」                                                        |
| 9   | aria     | `/`    | default | 両方         | region ×8・article ×9 の挿入                                                                | ランドマーク化により全行がずれる                                                                        | absorbed_registry                  | 許容（宣言済み） | `intentional_diffs.may_change`「セクション・カードのランドマーク化（新側のみ）」。正規化して除去したうえで残差を確認した |
| 10  | aria     | `/`    | default | 両方         | LAPRAS のリンク・画像 3 行                                                                  | 現側にあり新側に無い                                                                                    | —                                  | スコープ外       | ID 5・6 と同じ                                                                                                           |

**画素経路の非スコープ外の差分は desktop 6px（全体の 0.00008%）・mobile 11px（0.00009%）**。要素単位のスクリーンショット（hover / focus × 3 要素 × 2 ビューポート＝ 12 対）は**すべて 0 差分**だった。

### 微小残差の調査（ID 3・4）

desktop 6px・mobile 11px。**位置は完全に一致**しており（`careers.project.toyota-outsystems.heading`
などの `rect` が現新で 1/16px まで同値）、違うのは輪郭画素の濃度だけ（最大で 38 段階）。
グリフの並びも一致している（同じ行の他の画素は 1 段階も違わない）。

次の 2 つは**実験で否定した**。原因は未特定のまま残る。

| 仮説                                                                              | 検証方法                                                               | 結果                                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| body の高さが 483px 違う（LAPRAS 不在）ことでグラデーションのディザリングがずれる | 新側に `body::after` で 483px の余白を足して高さを揃え、同じ領域を比較 | **否定**。差分は desktop 6→6・mobile 11→12 でほぼ不変 |
| フォントファイルのビルド差（現行は `gasp` を持ち `inter-ui` は持たない）          | 同一文字列・同一サイズ・同一背景で 2 つの woff2 を直接描画して画素比較 | **否定**。差分画素 0                                  |

**原因**: 同じ Inter 3.019 だがサブセットのビルドが違う（現行は Google Fonts 由来で `gasp` テーブルを持ち、
`inter-ui` は rsms のリリース由来で持たない）。`gasp` はサイズごとのグリッドフィッティングを指示するため、
weight 600 のときだけラスタライズが数画素変わる。desktop の 6px は 20px/weight 600 の見出し
（`careers.project.toyota-outsystems.heading`）の実測値 6px とちょうど一致する。

消すには現行が配信している woff2 をそのまま vendoring するしかなく、pnpm 管理外になるため採らないと
判断済み（2026-07-29）。**分類（許容とするか）はユーザー承認待ちで、承認までは未説明差分として残す。**
`intentional_diffs.pending` へ記録した。

## 4. 要対応 — 差し戻し

| ID  | ページ | 想定フェーズ | 差し戻し内容                                                                                                                                                                                                                             |
| --- | ------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `/`    | テーマ       | `font-family` の値の差を `component_diffs` として宣言する。実体は同じフォントビルドで幅も一致しており、名前の差は避けられない                                                                                                            |
| 2   | `/`    | テーマ       | 源流で縮める（Tailwind v3 の既定境界色 `#e5e7eb` を `@layer base` で復元する）か、`component_diffs` として宣言する。**源流修正を推奨**——現状は描画に出ないが、今後 `border` を色指定なしで使った箇所が現行と別の色になる潜在差が残るため |

- 従った `on_diff` ドキュメント: `none`（`local-dev` に `on_diff` の指定なし）。既定どおり、この `diff.md` を入力に同じ `--target` の `parity-replace` へ差し戻す
- `loop.iterations` は 0 で上限 5 に達していないため、差し戻し可能

## 5. 許容 — 記録先とユーザー承認

| ID   | 記録先                                         | ユーザー承認                                         |
| ---- | ---------------------------------------------- | ---------------------------------------------------- |
| 3・4 | 未定（原因未特定のため記録先を決められない）   | **未承認**。原因が特定できるまで未説明差分として残す |
| 8・9 | `intentional_diffs.may_change`（既に宣言済み） | 承認済み（2026-07-29）                               |

## 6. 未検証領域

| 箇所                                     | 種別                     | 理由                                                                                                                                                                             |
| ---------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAPRAS セクション                        | 写らない（新側に未実装） | 機能 `lapras`（Issue #23）の担当。現側は 483px を占め、新側には無い。差分の大半（ID 5・6・7・10）はこれに由来する                                                                |
| 撮影環境の一致                           | 撮影条件                 | `capture_conditions.environment` は自由記述で機械照合できない（`unverified`）                                                                                                    |
| 利用者の閲覧環境（Windows）での見た目    | 撮影条件                 | 両側とも Linux(WSL) の Chromium で撮影しており、フォントフォールバックの解決先が利用者環境と異なりうる。実際にこの差で 1 件（日本語フォント）を見落とした経緯が `gaps.md` にある |
| アニメーション                           | アニメーション           | 停止させて比較するため扱えない                                                                                                                                                   |
| 名前の付かない要素の固定集合外プロパティ | 写らない                 | `box-shadow` / `opacity` / `letter-spacing` 等は特性照合の固定集合外で、画素経路のみが担う                                                                                       |
| 宣言できない構造差                       | 宣言できない構造差       | `gaps.md` の該当節は現時点で空（新側実装前に書かれたまま）                                                                                                                       |

## 6-2. 反復 1 の修正後の再検出（2026-07-29）

要対応 2 件の修正（`border-*-color` の源流是正・`font-family` の `component_diffs` 宣言）と、
画素差 17px の `component_diff_exceptions` 登録（ユーザー承認 2026-07-29）を受けて再検出した。

| 経路                                       | 反復 0                      | 反復 1                                                  |
| ------------------------------------------ | --------------------------- | ------------------------------------------------------- |
| 特性照合（desktop default）                | raw 633 → `unexplained` 633 | raw **137** → `absorbed_T` 136 / `unexplained` **1**    |
| 特性照合（mobile default）                 | raw 632 → `unexplained` 632 | raw **136** → `absorbed_T` 136 / `unexplained` **0**    |
| 特性照合（hover / focus × 2 ビューポート） | 各 15                       | 各 3（すべて `absorbed_T`）                             |
| 画素（LAPRAS 領域を除く）                  | desktop 6px / mobile 11px   | 同じ（`component_diff_exceptions` で承認済み）          |
| aria（正規化後）                           | 7 行                        | 7 行（GitHub 綴り 4 ＝宣言済み、LAPRAS 3 ＝スコープ外） |

`border-*-color` の 508 件は**全消**した。新側の自己ノイズは再測定して全 6 組ゼロ。

残る `unexplained` は 1 件のみ。

| 残差                                                                             | 内容        | 扱い                                                                                                                                                                                              |
| -------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page.main` と `careers.project.toyota-outsystems.heading` の相対幾何 `vertical` | `gt` → `lt` | LAPRAS 不在で `main` が 483px 短く、上下中心の関係が反転する。要素の位置・並びは 1/16px まで一致。**機能 `lapras`（Issue #23）の実装で解消する見込み**で、それまでは未検証として `gaps.md` に記録 |

## 7. 収束判定

- 未説明差分: **11 件**（default 1 件、hover / focus 10 件。いずれも LAPRAS 不在に由来し Issue #23 待ち）
- 未修正回帰（`deviates_T` / actionable）: 0 件（宣言済みの特性差からの逸脱は検出していない）
- 「許容」例外の確定（ユーザー承認）: **済**（2026-07-29 に承認。旧設定の 7 行は v1.34.0 移行時に bbox 単位の 9 インスタンスへ分解）
- 収束: **converged: false**

根拠: 反復 1 で要対応 2 件は解消し、許容の承認も済んだが、`diff-normalize.mjs` が desktop default で
`unexplained` を 1 件、hover / focus で合計 10 件返している。**いずれも LAPRAS セクションが新側に
無いため main の高さとスクロール可能範囲が 483px 短いことに由来し、`static-page` の範囲では
解消できない。** 機能 `lapras`（Issue #23）の実装後に再判定する。`blocked_by` へ帰属させても
未説明差分から差し引かず、未収束のまま残す。

## 8. v1.34.0 契約への移行検証（2026-07-31）

`local-dev` を `new-capture` project で baseline / noise の別パスとして再採取し、v1.34.0 の決定論的差分器で再照合した。旧設定の例外 7 行は、ワイルドカードを使わず実測 bbox ごとの **9 インスタンス**へ分解して `.replace/parity/static-page/component-diff-exceptions.json` に移した。原因は `font-subset-weight600` に 1 回だけ定義し、全インスタンスが参照する。台帳の不整合は 0 件だった。

| 経路     | 検証結果                                                                                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 画素     | desktop 2 / mobile 7 の bbox が台帳の 9 インスタンスと一致。LAPRAS 領域は例外へ入れない。                                                                                                                               |
| 特性照合 | default は desktop `absorbed_T: 136` と LAPRAS 由来の相対幾何 1 件、mobile `absorbed_T: 136`。hover/focus は `absorbed_T: 12` のほか、LAPRAS 不在で `scrollIntoView` 後の位置関係が変わる相対幾何候補 10 件を検出した。 |
| aria     | desktop / mobile とも生 256 行。従来の GitHub 表記とランドマーク化の宣言を適用する補助経路である。                                                                                                                      |

新側の自己ノイズは 2026-07-31 に全 6 組を測り直し、画素・特性とも全組ゼロ、default の aria も
両ビューポートで一致した。`PARITY_NOISE_PAIRS=/|default|desktop` の再実行では指定した 1 組だけを
採取し、指定外の古い `noise-pass2` 成果物が除去されることも確認した。

### v1.34.0 の正式差分 ID

| ID      | 経路     | 状態    | ビューポート | 内容                                                                     | 分類                         |
| ------- | -------- | ------- | ------------ | ------------------------------------------------------------------------ | ---------------------------- |
| TD-001  | 特性照合 | default | desktop      | `page.main` と職務経歴見出しの相対幾何 `vertical` が `gt` → `lt`         | unexplained / Issue #23 待ち |
| THD-001 | 特性照合 | hover   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop hover 3 件中 1 件） | unexplained / Issue #23 待ち |
| THD-002 | 特性照合 | hover   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop hover 3 件中 2 件） | unexplained / Issue #23 待ち |
| THD-003 | 特性照合 | hover   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop hover 3 件中 3 件） | unexplained / Issue #23 待ち |
| TFD-001 | 特性照合 | focus   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop focus 3 件中 1 件） | unexplained / Issue #23 待ち |
| TFD-002 | 特性照合 | focus   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop focus 3 件中 2 件） | unexplained / Issue #23 待ち |
| TFD-003 | 特性照合 | focus   | desktop      | `scrollIntoView` 後の代表要素間相対幾何候補（desktop focus 3 件中 3 件） | unexplained / Issue #23 待ち |
| THM-001 | 特性照合 | hover   | mobile       | `scrollIntoView` 後の代表要素間相対幾何候補（mobile hover 2 件中 1 件）  | unexplained / Issue #23 待ち |
| THM-002 | 特性照合 | hover   | mobile       | `scrollIntoView` 後の代表要素間相対幾何候補（mobile hover 2 件中 2 件）  | unexplained / Issue #23 待ち |
| TFM-001 | 特性照合 | focus   | mobile       | `scrollIntoView` 後の代表要素間相対幾何候補（mobile focus 2 件中 1 件）  | unexplained / Issue #23 待ち |
| TFM-002 | 特性照合 | focus   | mobile       | `scrollIntoView` 後の代表要素間相対幾何候補（mobile focus 2 件中 2 件）  | unexplained / Issue #23 待ち |

hover / focus の 10 件は v1.34.0 の正規化器が明示したもので、別の回帰ではない。いずれも
`.replace/features.md` にある `lapras`（Issue #23）に帰属し、同じ `local-dev` の
`.replace/parity/lapras/new/local-dev/replace-metadata.json` が存在しないことを確認した。
LAPRAS 実装後に再判定するまで、`static-page` は収束させない。

### 正式な結果件数

| 項目                         | 件数 |
| ---------------------------- | ---: |
| 検出候補合計                 |   20 |
| 要対応（actionable）         |    0 |
| 承認済み画素例外（accepted） |    9 |
| 環境ノイズ（noise）          |    0 |
| 未説明（unexplained）        |   11 |
