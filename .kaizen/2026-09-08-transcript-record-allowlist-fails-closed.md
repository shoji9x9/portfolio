---
date: 2026-09-08
type: upstream
priority: high
status: pending
applied-to: []
session: claude-code
---

# ホスト出力を allowlist で解釈する外部ツールは、ホスト更新で恒久的に fail closed へ倒れる

## 事象

Issue #100 の `.claude/settings.json` 変更を commit しようとしたところ、kaizen のコミット前ゲートが
fail closed でブロックした。理由は 2 つ表示された。

1. `kaizen-candidate-scan: transcript contains an unsupported or malformed record`
2. `user correction: transcript line 116`

どちらも実際には該当する事実がなかった。1 回で終わらず、以降の全 commit が同じ理由で止まる。

## 根本原因

`kaizen-candidate-scan.sh` が Claude Code の transcript JSONL を**固定の allowlist で分類**しており、
Claude Code 側が増やしたレコード型に追従していない。実測（この transcript の型ヒストグラムと
スクリプトの jq 分類器を突き合わせ）:

| レコード型                                                                              | 件数     | 分類          |
| --------------------------------------------------------------------------------------- | -------- | ------------- |
| `bridge-session`                                                                        | 15       | **X（未知）** |
| `atis-latch`                                                                            | 15       | **X（未知）** |
| `attachment` / `mode` / `permission-mode` / `last-prompt` / `system` / `file-history-*` | 各 1〜59 | R（既知）     |

`bridge-session` / `atis-latch` は allowlist（`ai-title` / `attachment` / … / `started`）に無い。
X が 1 件でも出ると scan は exit 2 を返し、ゲートは「形式不明」で fail closed する。
この 2 型は Remote Control 接続時に出るため、**Remote Control を使う限り毎回の commit が止まる**。
「候補ゼロなら自動通過」という設計上の高速路は、この構成では一度も成立しない。

理由 2 は別の原因。`type: "user"` 分岐が `$j.message.content` を `content_text` で平坦化して
「ユーザー発話」として扱うが、Claude Code は **tool_result も `type: "user"` レコードで運ぶ**。
line 116 は `.agents/skills/kaizen/references/housekeeping.md` を grep したツール出力で、
本文中の「削除**ではなく**アーカイブ」がユーザー修正指示の正規表現 `ではなく` に一致していた。
同分岐は 4 行下で tool_result をエラー判定用に別途取り出しており、構造は認識しているのに
ユーザー発話抽出側から除外していない。

共通する根本原因は、**外部ツールがホストの出力形式を「列挙で理解できているつもり」で解釈している**こと。
列挙は更新で必ず陳腐化し、陳腐化は fail closed 側に倒れるため、正しさではなく可用性を静かに失う。

## 提案

外部ツールがホストの出力形式を allowlist で列挙しているときは、ホスト更新で未知の値が増えて恒久的に
fail closed へ倒れることを疑う。ゲート・チェックが毎回同じ理由でブロックしたら、指摘された候補の中身を
調べる前に、**実データの値ヒストグラムと allowlist を突き合わせて列挙の網羅性を測る**。

本件の具体アクション（`.agents/skills/` の外部インストール済みスキルは AGENTS.md により当リポジトリーで
直接修正しない。開発元へ Issue で報告する）:

1. 未知レコード型を一律 exit 2 にせず、**分類に寄与しない型は無視して走査を続ける**（allowlist を
   「無視してよい型」ではなく「意味を持つ型」の側だけに使う）。少なくとも `bridge-session` /
   `atis-latch` を既知側へ追加する。
2. `type: "user"` 分岐のユーザー発話抽出から `tool_result` ブロックを除外する
   （エラー判定用の既存分岐はそのまま残す）。
3. 報告には再現に必要な最小限の公開可能情報だけを載せる（レコード型名と分類結果の表まで。
   transcript 本文・リポジトリー固有のパスや内容は含めない）。
