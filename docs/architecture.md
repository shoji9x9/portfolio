# 新側アーキテクチャの決定記録

- 決定日: 2026-07-31
- 決定者: ユーザー

## 採用する骨格

- フロントエンドは TypeScript 7、React 19、TanStack Router、Tailwind CSS 4 を使う Vite 8 の SPA である。
- エントリは `src/main.tsx`、ルーティングは `src/router.tsx`、現在の公開ルートは `/` の単一ページである。共通 AppShell は置かず、`src/App.tsx` がポートフォリオの各セクションを構成する。
- UI は `src/components/portfolio/`、静的コンテンツは `src/data/`、共有ユーティリティは `src/lib/` に分ける。パス別名 `@/` は `src/` を指す。
- 現在のページは静的データだけで表示し、DB・バックエンド API・ファイルストレージは使わない。LAPRAS は Issue #23 で `GET /api/lapras-preview` を追加する方針だが、取得方式と失敗時の扱いは未決定である。
- 開発は `pnpm dev`、本番相当は `pnpm build` と `pnpm preview` を使う。Vitest と Playwright は各々単体・パリティ検証を担う。
- 配信は GitHub Actions から Cloudflare Pages へ静的成果物を直接アップロードする。PR は preview、`main` は production へデプロイする。

## 未決定の機能固有事項

LAPRAS の取得方式と失敗時の扱いは Issue #23 で決める。これは上記の骨格を変更せず、機能固有の API 設計として扱う。
