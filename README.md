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
- アプリ（pnpm 管理）: TypeScript v7, React, Tailwind CSS v4, Vite / Vitest, React Compiler ほか

Cloudflare デプロイ、shadcn/ui、Playwright は Issue #4 で導入予定です。

## 開発

開発フロー・ブランチ運用・commit 規約などは [AGENTS.md](AGENTS.md) を参照。

## ライセンス

[MIT License](LICENSE)
