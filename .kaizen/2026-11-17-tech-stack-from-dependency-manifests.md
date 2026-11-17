---
date: 2026-11-17
type: doc
priority: medium
status: pending
applied-to: []
session: claude-code
---

# 技術スタックは依存マニフェストから棚卸しして提示する

## 事象

Issue #210 で制作物 recipe-box の技術スタックを Rust / Cloudflare / GitHub Actions として提案した。
ユーザーが htmx・TypeScript・JavaScript を指摘し、後から Cargo.toml・package.json・wrangler.toml を
読んで Axum・SQLite・Vitest も足した。既存の制作物 portfolio にも Vitest・Playwright が抜けていた。
技術スタックの後追いで、確認 2 往復と生成物・論理名カタログの再生成が 2 回起きた。

## 根本原因

- なぜ少なかった? GitHub の主言語（Rust）と README・CI の表層だけを見て決めた
- なぜ表層で決めた? その時点の問いを「Rust バッジを足すか」という既存バッジの差分に置き、
  使っている技術の全体を列挙しなかった
- なぜ列挙しなかった? 制作物・職務経歴の技術スタックをどこから導くかの手順が無く、
  AGENTS.md「変更対象は構造の全インスタンスで列挙する」をコンテンツに当てなかった（根本原因）

横断: 同じ新バッジを既存の制作物（portfolio）や職務経歴へ付けるかも、当初は確かめていなかった。

## 提案

制作物の技術スタックは、提示する前にそのリポジトリーの依存マニフェスト（package.json・Cargo.toml・wrangler.toml など）を読んで使っている技術を全部挙げ、新しいバッジを足すときは既存の制作物・職務経歴にも付けるかを合わせて確かめる。

適用先の候補: .replace/references/static-data-semantics.md（コンテンツ更新の手順）。
技術スタックを提示するときは「依存 → バッジ」の対応表と、新バッジを付ける既存項目の候補を一緒に示す。
