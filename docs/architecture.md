# 新側アーキテクチャの決定記録

- 決定日: 2026-07-31
- 決定者: ユーザー

## 採用する骨格

- フロントエンドは TypeScript 7、React 19、TanStack Router、Tailwind CSS 4 を使う Vite 8 の SPA である。
- エントリは `src/main.tsx`、ルーティングは `src/router.tsx`、現在の公開ルートは `/` の単一ページである。共通 AppShell は置かず、`src/App.tsx` がポートフォリオの各セクションを構成する。
- UI は `src/components/portfolio/`、静的コンテンツは `src/data/`、共有ユーティリティは `src/lib/` に分ける。パス別名 `@/` は `src/` を指す。
- LAPRAS 以外のページ内容は静的データだけで表示し、DB・ファイルストレージは使わない。
- LAPRAS プレビューは Cloudflare Pages Function の `GET /api/lapras-preview` が実行時に
  LinkPreview API から取得する。API キーは暗号化済み Secret binding
  `LINK_PREVIEW_API_KEY` として `context.env` から読み、リポジトリ・レスポンス・ログへ値を出さない。
- LinkPreview API は HTTPS で呼び、API キーは `X-Linkpreview-Api-Key` ヘッダーで送る。成功レスポンスは
  必要な `title` / `image` / `url` だけを検証・返却し、Cloudflare Cache API へ 24 時間保存する。
  Cache API はデータセンターごとのキャッシュであり、KV 等の永続ストレージは追加しない。
- 秘密値の不足、上流の失敗、応答形式の不正では `GET /api/lapras-preview` が安全な固定エラーを
  `503` で返す。外部レスポンス本文はログへ出さない。UI は LAPRAS セクション自体を残し、
  プレビュー画像を表示せずに公開プロフィールへのテキストリンクへフォールバックする。
- 開発は `pnpm dev`、本番相当は `pnpm build` と `pnpm preview` を使う。Vitest と Playwright は各々単体・パリティ検証を担う。
- 配信は GitHub Actions から Cloudflare Pages へ静的成果物を直接アップロードする。PR は preview、`main` は production へデプロイする。

## LAPRAS 機能の意図的差異

現行は静的エクスポートのビルド時に LinkPreview API を呼び、失敗時の明示的な表示を持たない。
新側は秘密値をブラウザーへ出さず、再デプロイせずに 24 時間ごとに更新できる実行時 API とする。
また、取得に失敗しても利用者が LAPRAS 公開プロフィールへ移動できるフォールバックを追加する。
これらは 2026-07-31 にユーザーが承認した機能固有の意図的差異である。
