---
date: 2026-08-24
type: doc
priority: medium
status: pending
applied-to: []
session: codex
---

# sandbox で Wrangler を実行するときはディスクログを制御する

## 事象

`mise exec -- wrangler --version` は終了コード 0 でバージョンを返した一方、
書き込み不可の `~/.config/.wrangler/logs/` にログを作ろうとして EROFS を出力した。
`WRANGLER_LOG_PATH=/tmp/wrangler-issue-81.log` を指定すると、同じ条件でエラーなく成功した。

## 根本原因

1. 読み取り専用に見える `--version` でも Wrangler は既定でディスクログを書く。
2. workspace sandbox では既定ログ先が書き込み範囲外だった。
3. ログ書き込み失敗でも終了コードが 0 のため、終了コードだけの確認では異常を見落とす。

KEDB 照合では同種の既存記録はなかった。直接実行箇所に加え、
`scripts/preview-url.mjs` も Wrangler を起動するため同じ前提が波及する。

## 提案

filesystem sandbox から Wrangler を実行するときは、公式ドキュメントに記載された
`WRANGLER_LOG_PATH` へ書き込み可能なパスを明示し、終了コードと stderr の両方を確認する。
