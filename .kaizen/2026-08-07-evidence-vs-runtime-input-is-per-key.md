---
date: 2026-08-07
type: doc
priority: high
status: applied
session: claude-code
---

# 「証跡か実行時入力か」の分類は、ファイル単位でもまだ粗い

## 事象

Issue #58 で資格を 1 件追加したとき、`.replace/parity/static-page/metadata.json` の
`traits.elements` を更新し忘れた。`logicalEntries()` は資格項目ごとに論理名を作るため、
178 件のままだと `baseline-new.spec.ts` の順序込み完全一致で新側採取が落ちる。

自分の検証（test / typecheck / lint / パリティスイート `--project=new` 54 件）はすべて
green で、`/code-review` が検出した。**前回 (#31) と同じ検出経路**。

## 根本原因

なぜ落としたか → 同ファイルの `dataset_version` を「現側採取時点の証跡だから凍結」と
判断し、その判断をファイル全体へ広げた。

なぜ広げたか → 直前の学び（2026-08-04）で身に付けた粒度が「ディレクトリー単位ではなく
ファイル単位」までで止まっており、同一ファイル内でキーごとに役割が分かれる形を知らなかった。

なぜ grep で洗わなかったか → AGENTS.md の当該節は「運用方針を決めるとき」に効く規律として
書かれている。今回は方針決定ではなく通常のデータ追加であり、規律の発火条件に入らなかった
← 根本原因

## KEDB 照合

[`2026-08-04-freeze-policy-is-a-flow-change.md`](2026-08-04-freeze-policy-is-a-flow-change.md)
（applied）と同一の根本原因の再発。applied のため追記せず、恒久側（AGENTS.md）を直接強化する。

## 横断スコープ

同じ構図のキー混在: `.replace/parity/<slug>/metadata.json` の `capture_conditions.browser`
（採取時に照合＝実行時入力）と `noise_baseline`（ゲート判定に使う）対 `dataset_version`（証跡）。
`.replace/dataset/metadata.json` の `version` も下流が陳腐化検出に読む。

CI（`.github/workflows/`）はパリティスイートも採取スペックも一切回していないため、
この種の不整合は現状どの自動チェックにも掛からない。

## 提案

正本データを変えたら、その値から機械的に導出される記録（件数・一覧・fingerprint）を
grep で洗う。「証跡か実行時入力か」の分類はファイル単位でも粗く、同一ファイル内でキーごとに
分かれる。凍結の判断は「そのとき更新不要だった記録」であって、更新不要なファイルの
永続的な名簿ではない。

反映先: AGENTS.md「運用方針（凍結・除外・基準化）を決めるとき」節。

## 適用（2026-08-07）

AGENTS.md の当該節へ 2 点を追記した。

- キー単位の粒度（`traits.elements` / `capture_conditions` 対 `dataset_version` を実例として明記）
- 分類が方針決定の場面に閉じないこと（正本データを変える通常の変更でも導出先を都度たどる）

`.agents/rules/` にしなかったのは、この規律が特定パス配下に閉じないため（前回と同じ判断）。

仕組み化（`traits.elements` の一致検査を `--project=new` でも走らせる）は候補として検討したが、
今回の変更範囲を広げないため見送った。`entries` フィクスチャは `containers` にのみ依存し
全 project から使えるので実現自体は可能で、`current` project での扱いと `lapras` slug
（`element_count` が `null`）での運用差が未検証の論点として残る。
