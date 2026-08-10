---
date: 2026-08-10
type: rule
priority: medium
status: pending
applied-to: []
session: codex
---

# pnpm のストア参照コマンドは sandbox の書き込み範囲を確認する

## 事象

`pnpm update nanoid --depth Infinity --lockfile-only` と、その後の
`pnpm why nanoid` が `StoreIndex.openDatabase` の
`ERR_SQLITE_ERROR: unable to open database file` で失敗した。
同じコマンドを権限昇格して再実行すると成功した。

## 根本原因

1. `--lockfile-only` や `why` でも pnpm はユーザーストアの SQLite index を開く場合がある。
2. Codex の workspace sandbox はリポジトリと `/tmp` のみ書き込み可能で、
   `~/.local/share/mise/` 配下の pnpm ストアは書き込めない。
3. lockfile 操作や依存照会をリポジトリ内だけで完結する処理と判断し、
   pnpm ストアへの書き込み可能性を実行権限の判断に含めていなかった。

## 提案

filesystem sandbox から pnpm を実行するときは、依存解決やストア index を参照する
`update`・`install`・`why`・`audit` 等についてユーザーストアの書き込み可否を考慮し、
既知の書き込み制限がある環境では最初から必要最小限の権限昇格を要求する。
`--lockfile-only` や照会系コマンドであることだけを根拠に、workspace 内で完結すると判断しない。
