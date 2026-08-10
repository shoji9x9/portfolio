---
date: 2026-08-10
type: doc
priority: medium
status: applied
applied-to:
  - mise.lock
  - .github/workflows/ci.yml
  - AGENTS.md
  - mise.toml
  - docs/quality-checks.md
session: claude-code
---

# ピン留めの正本を更新したら、解決結果を固定する層（lockfile）の有無を確かめる

## 事象

Issue #67 で mise 管理ツール 4 件を bump し、派生記録（`package.json` の `engines.node` /
`packageManager`、`pnpm-lock.yaml`、バージョン付きの観測記述）まで洗って完了扱いに
しようとしたところで、ユーザーから「mise の lock ファイルが存在しない」と指摘を受けた。
`mise.lock` は未作成で、取得 URL・チェックサム・provenance はどこにも固定されていなかった。

## 根本原因

1. なぜ気付かなかったか → `mise.toml` で厳密にピン留めしていることで再現性は足りていると見なした
2. なぜそう見なしたか → pnpm 側は `pnpm-lock.yaml` があるので lockfile を意識するが、mise は
   `mise.toml` が宣言と固定を兼ねているように見え、解決結果を別に固定する層の存在を疑わなかった
3. なぜ疑わないか → AGENTS.md のサプライチェーン対策が mise について `minimum_release_age` しか
   挙げておらず、「宣言（何を入れるか）」と「解決結果（どの成果物を入れるか）」が別レイヤで
   あることがリポジトリーの正本に書かれていなかった ← 根本原因

## 横断スコープ

同じ二層構造は他にもある。GitHub Actions は `uses:` のタグと SHA ピン（`pinact` で機械化済み）、
pnpm は `package.json` と `pnpm-lock.yaml`。mise だけが解決結果の固定を持っていなかった。

## 提案

バージョンを宣言するファイルを更新したら、その処理系に「解決結果を固定する層」があるかを
確かめ、無ければ導入する。あるのに更新していない状態は CI で落とす。

## 適用結果

- `mise.lock` を生成してコミットした（`mise lock --platform linux-x64`）。npm backend の 3 ツール
  （wrangler / viteplus / typescript-language-server）は URL・チェックサムを持たない。
- `ci.yml` の `check` へ "Verify mise.lock is up to date" を追加した。`--locked` / `MISE_LOCKED=1` は
  lockfile に無いツールでも install を通すため代替にならない（実測 2026-08-10 / mise 2026.5.16 linux-x64）。
- ゲートが捉えるのは**バージョンのずれ**まで。ツールが導入済みなら、`mise.lock` から platform
  ブロック（checksum / URL）だけを削っても `mise install` は補完しない（実測・同上）。
- **初版のゲートは無力だった。** `git diff --exit-code -- mise.lock` は追跡されていないファイルを
  見ないため、`git add` 漏れでも削除でも exit 0 になる（`/code-review` が指摘し、実測で確認）。
  存在検査（`git ls-files --error-unmatch`）と `git status --porcelain` へ置き換え、未追跡 /
  内容のずれ / 削除の 3 通りで exit 1、整合時のみ exit 0 になることを一時 git リポジトリーで確認した。
  最初の故障注入は「lock が古い」1 通りしか試しておらず、**防ぎたい失敗の全モードを列挙していなかった**。
- AGENTS.md / `mise.toml` / docs/quality-checks.md / `outdated.yml` の Issue 本文に運用を明記した。
