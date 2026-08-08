---
date: 2026-08-08
type: doc
priority: high
status: applied
session: claude-code
---

# 実測で得た運用知識は、外部スキルの記述と食い違ってもリポジトリー側の正本へ書く

## 事象

Issue #55（fast-uri 3.1.4 → 3.1.5）の transitive 更新は
`pnpm update fast-uri --depth Infinity --lockfile-only` 一発で成功した。
しかしその「バージョンを明示しない」という決め手の根拠は、Claude Code の
個人メモリ（`~/.claude/.../memory/`）にしか存在しなかった。

リポジトリーの共有知である
`.agents/skills/dependabot-alert-issue/references/pnpm-transitive-update.md:12` は
`pnpm update <pkg>` と `pnpm update <pkg>@<version>` を「どちらも再解決されない
ことがある」と同一視しており、前セッション（Issue #62 / nanoid）の実測
——ゲート無効条件で無指定は 3.3.18 に到達、`nanoid@3.3.17` 明示は 3.3.16 据え置き——
と矛盾する。同ファイルはリリース年齢ゲートの無言据え置き（`update` は黙って旧版
維持、`add` は `ERR_PNPM_NO_MATURE_MATCHING_VERSION` で落ちる）にも触れていない。

結果として Codex / Copilot、あるいはメモリを持たない次セッションが同じ作業を
したとき、「経路が効かない」と誤判定する余地が残っている（#62 で実際に一度
調査コストを払っている）。

## 根本原因

1. なぜ実装側に届かないか → 更新実行の知識が起票側スキル
   （`dependabot-alert-issue`）の references にしかなく、修正作業
   （`issue-start` での実装フロー）はそのスキルを読まない。
2. なぜそこにしかないか → その知識が「着手可否の判定材料」として書かれており、
   更新を実行するフェーズを読者として想定していない。
3. なぜ実測が反映されないか → 当該ファイルは外部インストール済みスキル配下で、
   AGENTS.md「外部スキルの問題報告」により本リポジトリーでは直接修正しない。
   実測で得た知見の受け皿がリポジトリー側に無いため、エージェント個人メモリに
   滞留する ← 根本原因

## 横断スコープ

同じ構図は他の外部スキル（`parity-*` / `dependabot-merge` 等）の references 全般に
潜む。実測がスキル記述と食い違ったとき、リポジトリー側に置き場が無いと知見は
個人メモリへ閉じ、エージェント間で共有されない。

## 提案

実測で得た運用知識が外部インストール済みスキルの記述と食い違ったら、外部スキルを
直接修正せず、リポジトリー側の正本ドキュメントへ実行知識を書き、矛盾は開発元へ
Issue で報告する。エージェント個人メモリに留めない。

具体策:

- `docs/dependency-policy.md` に「transitive 依存を patched 版へ上げるとき」節を追加する
  - バージョンを明示しない `pnpm update <pkg> --depth Infinity` を第一候補にする
    （transitive にバージョンを明示すると据え置かれる）
  - リリース年齢ゲートは `update` では無言で据え置くため、「ゲートで止まった」のか
    「経路が効かない」のかは `pnpm add` のエラー文（cutoff 時刻つき）で切り分ける
  - 詳細手順は外部スキルの references を参照する旨のリンクを張る
- 上記の矛盾（同一視の記述）は開発元へ Issue で報告する。再現に必要な最小限の
  公開可能情報のみを記載し、本リポジトリーの URL・構成は含めない

## 適用結果

`docs/dependency-policy.md` に「transitive 依存を patched 版へ上げるとき」節を追加した
（実測の条件つきで記述し、詳細手順は外部スキルの references へリンク）。
開発元への Issue 報告は本セッションで別途行う。
