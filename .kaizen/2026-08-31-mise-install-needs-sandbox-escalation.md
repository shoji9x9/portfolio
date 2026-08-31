---
date: 2026-08-31
type: rule
priority: medium
status: pending
applied-to: []
session: codex
---

# mise の状態更新コマンドは sandbox 外の内部ロック書き込みを考慮する

## 事象

Issue #89 のツール更新後に `mise install` を workspace sandbox 内で実行したところ、ツール本体は
導入済みと判定されたが、`~/.config/mise/.mise.lock` へ書き込めず EROFS で終了コード 1 になった。
権限付きで同じコマンドを再実行すると成功し、前後の `mise.lock` の SHA-256 が一致した。

## 根本原因

1. なぜ失敗したか → mise が workspace 外の `~/.config/mise/.mise.lock` を更新しようとした
2. なぜ最初から権限付きで実行しなかったか → 全ツールが導入済みなら読み取りだけで終わると考えた
3. なぜそう考えたか → プロジェクトの `mise.lock` 更新と mise 自身の内部状態更新を区別せず、
   `mise install` の副作用をプロジェクト配下だけだと扱っていた

既存 KEDB を `read-only file system` / `mise install` / `.config/mise` で照合した。pnpm のストア参照と
Wrangler のディスクログには同種の sandbox 記録があるが、mise の内部ロックを対象にした記録はなかった。
横断確認では `mise upgrade` も導入・削除・reshim を行うため、同じ内部状態更新を伴う。

## 提案

filesystem sandbox から `mise install` / `mise upgrade` を実行するときは、mise の内部状態が
workspace 外へ書き込まれる前提で最初から権限昇格し、終了コードと対象プロジェクトの差分を確認する。
