---
date: 2026-09-07
type: doc
priority: high
status: pending
applied-to: []
session: claude-code
---

# ツールチェーンのメジャー更新は CI の外にいる設定の消費者まで確認する

## 事象

Issue #98 で mise 管理ツールを更新し、pnpm を 11.23.0 → 12.1.0（メジャー）へ上げた。
CI が実行する検査（`install --frozen-lockfile` / `audit signatures` / `format:check` / `lint` /
`lint:md` / `lint:sh` / `check:node-version` / `knip` / `jscpd` / `react:doctor` / `typecheck` /
`test` / `build` / `license:check`）を全て手元で流して exit 0 を確認し、pnpm 12 のリリースノートの
破壊的変更もリポジトリーの入力と突き合わせて「影響なし」と報告した。

その後ユーザーから「何かが pnpm 12 に対応していなかった覚えがある。Dependabot や GitHub Actions
周辺」と指摘され、調査して判明した——Dependabot は pnpm 12 に未対応（dependabot-core の
`PNPMPackageManager::SUPPORTED_VERSIONS` は 7〜11、GitHub docs の Supported ecosystems は v7〜v10、
上流 Issue [dependabot/dependabot-core#16095](https://github.com/dependabot/dependabot-core/issues/16095)
は open）。pnpm 12 は `bin` がプレースホルダーで実行時に `@pnpm/exe.<platform>` を取得する構造に
変わり、Dependabot のサンドボックスではその取得が失敗して更新ジョブごと落ちる。副次的に
transitive 依存の `minimumReleaseAge` cooldown も無効化される。pnpm の更新を撤回し 11 系の最新へ
差し替える手戻りになった。

## 根本原因

1. なぜ見落としたか → 検証を「CI が実行するコマンド一式」で構成した
2. なぜそれで十分だと考えたか → ツール更新の影響範囲をリポジトリー内のビルド・lint・テストに限定した
3. なぜ限定したか → `mise.toml` / `package.json` の `packageManager` / `pnpm-lock.yaml` を
   「CI が読む入力」としか分類せず、**CI の外にいる消費者（Dependabot・GitHub の依存グラフ）も
   同じファイルを読んで別の実行系で動かす**という分類をしていなかった ← 根本原因

KEDB 照合（`Dependabot`/`package.json`、`CI green`/`pnpm`、`メジャー更新`/`mise.toml`、`検証`/`CI`、
`engines`/`package.json`）では同一原因の記録は無かった。最も近いのは applied の
[[2026-07-28-toolchain-scope-both-ways]]（追加物を既存ツールがどう扱うかを確認していなかった）だが、
そちらはリポジトリー内の品質チェックのスコープが対象で反映先も `docs/quality-checks.md`。
CI の外の消費者は射程外だった。[[2026-08-03-green-check-is-not-evidence-of-action]] とも
「green を根拠にした」点で近いが、あちらは _実行されたジョブの中身_ を読まなかった話で、
こちらは _そもそも実行されない経路_ を数えなかった話。

横断スコープ（同じ構図の消費者）:

- Dependabot（`.github/dependabot.yml` / `packageManager` / `pnpm-lock.yaml`）
- GitHub の依存グラフ・Dependency Review（`pnpm-lock.yaml` の形式。実際 dependabot-core #15904 は
  pnpm 12 の複数ドキュメント lockfile を依存 0 件と誤読していた）
- Cloudflare Pages（`wrangler` の版。デプロイは GitHub Actions 経由のため今回は CI 内）

いずれも「CI が green でも壊れているか分からない」経路。

## 提案

ツールチェーン（パッケージマネージャー・ランタイム）のメジャー更新では、CI の合格に加えて
**リポジトリーの設定ファイルを CI の外で読む消費者**が新バージョンに対応しているかを一次情報で
確認する。確認先は提供元の対応表と実装（Dependabot なら GitHub docs の Supported ecosystems と
dependabot-core の `SUPPORTED_VERSIONS`、加えて上流 Issue）。未対応なら更新を保留し、理由・
上流 Issue・解除条件をリポジトリーの方針ドキュメントへ書く。

パス限定ではなく全体に効かせたい規律のため、反映先は基底ドキュメント `AGENTS.md`
（「ワークフロー」の品質チェック周辺）。決定論的なゲート化も検討したが、Dependabot の対応表は
機械可読でなく版ごとに変わるため規律に留める。今回の pnpm 固有の判断そのものは
`docs/dependency-policy.md`「pnpm のメジャー更新を保留している理由」に記録済み。
