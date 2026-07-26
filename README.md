# portfolio

[shoji9x9.github.io](https://shoji9x9.github.io/) を新リポジトリ `shoji9x9/portfolio` と
**Cloudflare** へ移行するプロジェクト。

## セットアップ

前提: [mise](https://mise.jdx.dev/) がインストール済みであること。

```bash
mise install   # node, pnpm, 各種 CLI を導入
pnpm install   # 依存パッケージを導入
```

## 技術スタック

- ランタイム/ツール（mise 管理）: Node.js, pnpm, gitleaks, actionlint, ghalint, pinact, shfmt, shellcheck, Cloudflare CLI(wrangler), vite+
- アプリ（pnpm 管理）: TypeScript v7, React, TanStack Router, Tailwind CSS v4, shadcn/ui,
  Vite / Vitest, React Compiler ほか

Playwright は後続 Issue で追加。

## 開発

```bash
pnpm dev   # 開発モード
pnpm start # build 後の production-like モード
```

通常の実装・確認は開発モードの <http://localhost:5173/> で実施。production-like モードは
<http://localhost:4173/> で確認する。デプロイの初回設定と PR preview／production の運用は
[Cloudflare Pages デプロイ](docs/deployment.md) を参照。

開発フロー・ブランチ運用・commit 規約などは [AGENTS.md](AGENTS.md) を参照。

## ライセンス

[MIT License](LICENSE)
