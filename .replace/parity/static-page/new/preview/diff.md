# 差分レポート（static-page / preview）

- slug: `static-page` / mode: `feature`
- 対象環境: `preview`（Cloudflare Pages のプレビュー。デプロイ固有 URL）
- 新側コミット: `b0cedeb`（`scripts/preview-url.mjs` がデプロイ元コミットと HEAD の一致を検証済み）
- 実施日時: 2026-07-29T11:05:00+09:00
- 反復: 0（差し戻しなし）
- 現側ベースライン: `.replace/parity/static-page/baseline/`（`current-prod` / `parity-suite` が採取）

## 1. 結論

**`preview` の差分は `local-dev` と完全に同一である。** 本番ビルド（minify・ハッシュ付きアセット）と
Cloudflare 配信を経ても、現行との差は 1 つも増えていない。

したがって本レポートは `local-dev` の
[差分レポート](../local-dev/diff.md)を正本として参照し、ここでは**同一であることの証拠**と
`preview` 固有の確認結果だけを記録する。

## 2. local-dev との同一性（決定論的に確認）

`preview` と `local-dev` の新側ベースラインを直接突き合わせた。

| 経路 | 結果 |
| --- | --- |
| 全画面スクリーンショット（desktop） | **差分画素 0 / 7,722,240**（寸法一致 1280×6033） |
| 全画面スクリーンショット（mobile） | **差分画素 0 / 12,179,280**（寸法一致 1240×9822） |
| 特性 JSON（2 ビューポート × 3 状態＝ 6 ファイル） | **全ファイルがバイト一致** |
| aria 比較の出力（desktop / mobile） | **完全一致**（いずれも 256 エントリ） |

新側どうしが画素・特性・aria のすべてで同一なので、現側との比較結果も必然的に同一になる。

## 3. preview に対する 3 経路の実測

同一性の確認だけで足りるが、`preview` を新側として現側ベースラインと直接比較した結果も記録する。

### 特性照合

| ビューポート / 状態 | raw | 正規化後 |
| --- | --- | --- |
| desktop / default | 137 | `absorbed_T` 136 / **`unexplained` 1** |
| mobile / default | 136 | `absorbed_T` 136 / `unexplained` 0 |
| desktop / hover・focus | 各 3（要素ごと） | 各 `absorbed_T` 3 / `unexplained` 0 |
| mobile / hover・focus | 各 3（要素ごと） | 各 `absorbed_T` 3 / `unexplained` 0 |

`absorbed_T` はすべて `component_diffs` の `font-family`（next/font のハッシュ付き名 → 自前の
`@font-face` 名）。`unexplained` の 1 件は `local-dev` と同じ
`page.main | careers.project.toyota-outsystems.heading` の相対幾何で、LAPRAS セクション不在に由来する
（[local-dev の diff.md](../local-dev/diff.md) の 6-2 節）。

### 画素

- 全画面: 現側 6516px / 新側 6033px（desktop）と高さが 483px 違う。差の実体は LAPRAS セクションの
  不在で、スコープ外（機能 `lapras` / Issue #23）
- 要素単位（hover / focus × 3 要素 × 2 ビューポート＝ 12 対）: **すべて 0 差分・寸法一致**

### aria

正規化前 256 エントリ。内訳は `local-dev` と同一（ランドマーク化 ＝ 宣言済み、GitHub 綴り ＝ 宣言済み、
LAPRAS ＝ スコープ外）。

## 4. hover / focus の要素対の相対幾何を比較対象にしない理由（実測で裏取り）

`local-dev` の diff.md は「hover / focus の特性照合は**要素ごとに**比較する。採取時に要素を 1 つずつ
hover するとスクロール位置が動き、要素対の相対幾何が採取順の副作用で変わるため」と記録している。
今回この副作用の**非対称性**を実測できたので、根拠として追記する。

| 要素 | 現側の rect.y | 新側の rect.y |
| --- | --- | --- |
| `desired-work.link`（desktop / hover） | 439.8125 | **749.8125** |
| `artifacts.card.portfolio.url-link` | 439.8125 | 439.8125 |
| `account.link.github` | 392.8125 | 392.8125 |

`rect` はビューポート相対。ずれるのは `desired-work.link` だけで、他の 2 要素は一致する。

**原因**: LAPRAS は現行ページの**最終セクション**なので、その不在は「希望条件より下に残るスクロール余地」を
483px 減らす。最終セクションのリンクを `scrollIntoView` したとき、現側はさらに上まで送れるが新側は
文書末尾に当たって送りきれず、ビューポート内の位置が下がる。

要素そのものは**画素まで一致**しており（`desired-work.link.png` は 0 / 7056 差分・寸法一致）、
描画の差ではなく採取条件の差である。したがって要素対の相対幾何は現新比較のシグナルにならない。
これも Issue #23 で解消する見込み。

## 5. 収束判定

- 未説明差分: **1 件**（`local-dev` と同一。LAPRAS 不在に由来）
- 要対応（actionable）: **0 件**
- 収束: **converged: false**

根拠は `local-dev` と同じ。差分器が `unexplained` を 1 件返しており、その原因が `static-page` の
範囲では解消できないため `blocked_by: #23` として記録する。要対応がゼロなので `parity-replace` へは
差し戻さない。

## 6. 未検証として残すもの

- **利用者の閲覧環境**: 採取は Linux(WSL) の Chromium・devicePixelRatio 1・colorScheme light。
  利用者環境（Windows）でのフォントフォールバック差はこの採取では検出できない
  （`gaps.md`「実行環境による見た目差」）
- **`production` 環境**: 未デプロイのため未検証
