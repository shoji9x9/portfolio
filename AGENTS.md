# portfolio

全エージェント（Codex / Claude Code / GitHub Copilot）共通の指示。各エージェント固有の差分は
`CLAUDE.md` / `.github/copilot-instructions.md` に記述する。共通内容はこのファイルへ集約し、複製しない。

## プロジェクト概要

[shoji9x9/shoji9x9.github.io](https://github.com/shoji9x9/shoji9x9.github.io)（公開先: <https://shoji9x9.github.io/> ）を、
新リポジトリ `shoji9x9/portfolio` と新プラットフォーム **Cloudflare** へ移行するプロジェクト。

- 移行元と同等の内容を目指す。移行の進め方は `replace-strategy` 等（`parity-*` 系スキル）を用いる。
- UI コンポーネントは変更予定。その結果としてコンポーネントレベルでの機能・見た目の変更は許容する。
- 本プロジェクトを通して `replace-strategy` 等のスキルのブラッシュアップも行う。
- 実コンテンツ／ページの移行実装に先立ち、開発基盤（ツールチェーン・ドキュメント・CI）を整備する（Issue #1）。

## 技術スタック

**mise で管理（`mise.toml`）** — ランタイム・言語非依存の CLI

- node / pnpm
- gitleaks / actionlint / ghalint / pinact / shfmt / shellcheck
- Cloudflare CLI（wrangler） / vite+（vite・vitest・oxlint・oxfmt などを内包）

**pnpm で管理（`package.json`）** — プロジェクト結合の強い依存

- TypeScript v7（LSP も v7 に統一） / tsx
- react / tailwindcss v4 / tailwind-merge / clsx / babel-plugin-react-compiler / react-doctor
- oxlint（type-aware）/ oxfmt / Tailwind lint プラグイン
- lefthook / commitlint / markdownlint-cli2 / knip / jscpd
- Playwright（`@playwright/test`）/ pixelmatch + pngjs — 移行の等価性検証（パリティスイート）用。
  実体は `e2e/`、実行方法は [docs/quality-checks.md](docs/quality-checks.md) を参照する

**サプライチェーン対策** — 依存経由の攻撃への多層防御

- mise: `minimum_release_age` で新しすぎるツールリリースの採用を遅延
- pnpm: `pnpm-workspace.yaml` の `minimumReleaseAge` などで新しすぎるパッケージ公開の採用を遅延
- Dependabot による依存更新、Dependency Review、ライセンスチェック（AGPL 等リスクのあるライセンスを禁止）

## ワークフロー

### 環境セットアップ

```bash
mise install       # mise 管理ツール（node, pnpm, 各 CLI）を導入
pnpm install       # 依存パッケージを導入
```

### chrome-devtools MCP

`.mcp.json` の chrome-devtools MCP には `--isolated` を付ける。**外さないこと。**
既定では `~/.cache/chrome-devtools-mcp/chrome-profile` を共有プロファイルとして使うため、
複数のエージェントセッションが同時にブラウザーを起動できず、後発のセッションが
「The browser is already running for ...」で接続できなくなる。`--isolated` はサーバーインスタンスごとに
一時プロファイルを作り終了時に破棄するため、この競合が起きない。

プロファイルは毎回破棄されるので Cookie・ログイン状態は残らない。現状の対象環境は
`browser-test.environments` がいずれも `auth: none` で影響しないが、認証が要る環境を追加するときは
ログイン手順をスイート側に持たせる。

### ブランチ運用・commit 規約

- **ベースブランチ**: `main`
- **ブランチ名**: `feature/<Issue番号>-<英語の短い説明(kebab-case)>`（例: `feature/1-initial-setup`）
- **commit**: [Conventional Commits](https://www.conventionalcommits.org/)。`commitlint` + `lefthook` で検証する。
  - 種別例: `feat` / `fix` / `docs` / `chore` / `refactor` / `test` / `ci` / `build`
- 無関係な変更を同じ commit に混ぜない。関連ファイルだけを stage する。
- `commit --amend` と force push は行わない。
- Issue 起点の作業は `issue-start <番号>` で開始する。

### PR 運用

- PR には関連 Issue・変更概要・確認内容を含める。
- AI 再レビューは `review_tool`（既定 `copilot`）に依頼する（`.config/skills/shoji9x9/skills.yml`）。
- PR 仕上げ・レビュー対応は `pr-finalize-loop` / `pr-review-handle` を用いる。
- レビュー・自動解析の**効率系所見**（スキップ・キャッシュ・省略などの最適化）は、採用するときも
  外部へ提案するときも、**「冗長が実在するか」とは別に「省いて正しさが保たれるか」**を対象
  ワークフローの一次情報と突き合わせて検証する。所見が「検証済み」でも、それは前者の検証でしか
  ない。誤スキップの代償（偽の green・古い成果物の検証）が節約に見合うかも評価する。
- **成功したチェック・ジョブは「その名の作業を実行した」証拠ではない。** 条件不成立で本体ステップを
  skip してもジョブは success で終わる。自動化に依存する前・依存を疑うときは、実行ログか出力で
  **実際に何をしたか**を確認する。自分で自動化を書くときは、スキップした事実と理由を必ず
  可視化させる（無言の skip を残さない）。
- 反復的な手作業（依存更新のマージ等）を始める前に、**それを担う自動化がリポジトリーに既にあるか**を
  確認する（`.github/workflows/` とチェック名を見る）。

### 記述言語

- セッション応答、作成・更新するドキュメント、コード内コメント、GitHub Issue・PR の本文とコメントは日本語で記述する。

### 品質チェック

静的解析・検査ツールと、実行タイミング（pre-commit / pre-push / CI）・対象ファイルの一覧は
[docs/quality-checks.md](docs/quality-checks.md) を参照する。lint は最初から厳格（ラチェットなし）で、
検出はすべて error として扱う。

### 調査と実験

原因調査で仮説を「否定した」「一致した」と結論する前に、**差分・不具合が実際に観測された条件を列挙し、
その条件そのもので測る**。

- 測りやすい代表値 1 点で測って全体に一般化しない（例: 差が出ているのが太字だけなのに標準ウェイトで測る）。
- 比較の相手は常に正解（現行の実測値・報告された事象）であって、実験変種どうしではない。
  「両者を同じ土俵に乗せる」ことを優先した結果、土俵から正解が抜け落ちていないか確かめる。
- 結論を成果物へ書くときは、**どの条件で測ったか**を併記する。条件を書けない結論は、まだ結論ではない。

### エージェントの自己設定編集について

コーディングエージェントは自身の設定ファイルの編集が制限される場合がある（自己改変ガード）。
設定ファイルを書き換える作業（kaizen の Hook セットアップ等）でブロックされたら、適用すべき内容を
一時ファイルに書き出し、ユーザーに `cp <tmp> <設定ファイル>` 等での適用を依頼する。

| エージェント   | 自己設定ファイル             | 編集可否                                                     |
| -------------- | ---------------------------- | ------------------------------------------------------------ |
| Claude Code    | `.claude/settings.json`      | 不可（ハードブロック。bypass でも確認が出る）                |
| Codex          | `.codex/config.toml` / hooks | 現状は可（ただし credentials/auth/profile 等の上書きは制限） |
| GitHub Copilot | `.github/agents/`（指示）    | 不可（ハードブロック）                                       |
| GitHub Copilot | `.github/hooks/`（フック）   | 可（手動承認ガードの設定を推奨）                             |

### 外部スキルの問題報告

- `.agents/skills/` と `.claude/skills/` の外部インストール済みスキルは、このリポジトリーで直接修正しない。
- セキュリティ上の問題以外は、問題を見つけた場合にスキル開発元へ Issue を作成し、再現に必要な最小限の公開可能情報だけを記載する。
- セキュリティ上の問題は、開発元の脆弱性開示ポリシーに従って非公開の報告経路を使う。非公開経路がない場合は、外部へ報告する前にユーザーの承認を得る。
- このリポジトリーのコード、設定、URL、認証情報、利用者・顧客情報など、開発元の Issue に不要な情報は含めない。

## コンポーネント選択基準

知識・規約・処理を追加するときは skill / rule / hook / doc のどれに落とすかを判断する
（詳細は `multiagent-setup` の `references/component-selection.md`）。

- **skill**: 手順（再現可能な作業フロー）
- **rule**: 特定ファイル群に対する規約。`paths` は最小スコープにする（`**/*.ts` のような広域指定を避け、対象ディレクトリまで絞る）
- **hook**: イベント駆動の処理
- **doc**: 上記以外。常に必要なものは基底ドキュメント（AGENTS.md）へ集約し、スキル実行時のみ要る詳細は各 SKILL.md / references へ置く

## 参照スキルガイド

スキルの実体は `.agents/skills/<name>/`、Claude Code 用リンクは `.claude/skills/<name>`。

- `multiagent-setup`: スキル・ルール・Hooks・ドキュメントのセットアップ／整理
- `issue-create` / `issue-start`: GitHub Issue の起票と着手
- `replace-strategy`: 移行戦略の設計・設定（本プロジェクトの中核）
- `parity-diff` / `parity-replace` / `parity-suite` / `golden-dataset`: 移行元との等価性の検証・置換・データ整合
- `pr-review-handle` / `pr-finalize-loop`: PR のレビュー対応・仕上げ
- `dependabot-alert-issue` / `dependabot-merge`: Dependabot アラートの Issue 化・PR マージ
- `browser-test`: ブラウザ E2E テスト（ローカル環境を設定済み。Cloudflare 環境はデプロイ後に追加）
- `kaizen`: コミット前ゲート・継続的改善
