---
date: 2026-10-05
type: hook
priority: medium
status: pending
applied-to: []
session: claude-code
---

# メジャーを保留しているツールは、保留中の系列内の最新も自動で通知させる

## 事象

Issue #144（mise outdated の自動 Issue）は pnpm を「11.27.1 → 12.7.0（メジャー）」とだけ
載せていた。pnpm は方針で 12 系を保留し、「minimum_release_age を満たす 11 系の最新」を
採る（mise.toml のコメント）。11.28.0（2026-09-25 公開）〜11.28.4 が出ていたが Issue には載らず、
コミット直前に npm view で偶然気付いた。PR #135（Issue #134）でも同様に 11.27.1 を手で拾っている。

## 根本原因

1. なぜ見落としかけたか → Issue に 11 系の候補が載っていなかった
2. なぜ載らないか → outdated.yml は `mise outdated --bump --json` の latest（ツールごとに 1 件）
   だけを見て、メジャー差なら「メジャー更新」に分類する。保留中の系列内の最新は計算しない
3. なぜ計算しないか → 「メジャーを保留し、系列内は追従する」という方針（dependency-policy.md）を
   ワークフローが読まず、方針と通知経路が接続されていない ← 根本原因

KEDB 照合（outdated/pnpm、11 系/mise）では同一原因の記録なし。
横断スコープ: 方針でメジャーを止めるツールは現在 pnpm のみ。今後同様の保留を追加すれば同じ穴が開く。

## 提案

メジャー更新を保留するツールは、保留中の系列内の最新（minimum_release_age を満たすもの）も
通知経路に出させ、人の記憶や手作業の npm view に頼らない。

- outdated.yml でメジャー更新を検出したツールについて、current と同じメジャー内の最新
  （7 日経過分）を追加で求め、Issue の minor / patch 表へ「系列内最新」として載せる。
- 当面の手順として、pnpm の行がメジャー更新だけのときは 11 系最新を確認する旨を
  outdated.yml の Issue 本文テンプレートに書く。
