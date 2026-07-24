# Claude Code 設定

プロジェクト概要・技術スタック・ワークフロー・規約は [AGENTS.md](AGENTS.md) を参照する。
ここには Claude Code 固有の差分のみを記述する。

<!-- Claude Code が AGENTS.md を常時コンテキストへ読み込むための import 指定（上のリンクは人間が辿る用） -->
@AGENTS.md

## スキルの利用

- スキルの実体は `.agents/skills/<name>/`、Claude Code 用リンクは `.claude/skills/<name>`。
- スキル追加・更新・削除やドキュメント整備は `multiagent-setup` に従う（実体は `.agents/` に置き、`.claude/skills/` はシンボリックリンク）。

## ツール実行

- mise 管理ツールは `mise exec -- <cmd>` もしくは mise が有効化されたシェルで実行する（例: `mise exec -- pnpm install`）。
- 応答は日本語で行う。
