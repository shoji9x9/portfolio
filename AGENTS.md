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

- TypeScript v7（LSP も v7 に統一） / tsx / turbo / playwright
- react / tailwindcss v4 / shadcn/ui / tailwind-merge / clsx / babel-plugin-react-compiler / react-doctor
- oxlint（type-aware）/ oxfmt / Tailwind lint プラグイン
- lefthook / commitlint / markdownlint-cli2 / knip / jscpd / dependency-cruiser

**サプライチェーン対策** — 依存経由の攻撃への多層防御

- mise: `minimum_release_age` で新しすぎるツールリリースの採用を遅延
- pnpm: `.npmrc` の `minimumReleaseAge` などで新しすぎるパッケージ公開の採用を遅延
- Dependabot による依存更新、ライセンスチェック（AGPL 等リスクのあるライセンスを禁止）

## ワークフロー

### 環境セットアップ

```bash
mise install       # mise 管理ツール（node, pnpm, 各 CLI）を導入
pnpm install       # 依存パッケージを導入
```

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
- `browser-test`: ブラウザ E2E テスト（新アプリ整備後に設定）
- `kaizen`: コミット前ゲート・継続的改善
