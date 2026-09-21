---
date: 2026-09-21
type: doc
priority: medium
status: pending
applied-to: []
session: claude-code
---

# 実装コードを読んで挙動を断定する前に、その分岐に到達する条件を同じ一次情報で確かめる

## 事象

Issue #127 で `package.json` の `vite` を Vite+ core のエイリアスへ移す際、Dependabot がこのエイリアスを
どう扱うかを dependabot-core のソースで調べた。`npm_and_yarn/lib/dependabot/npm_and_yarn/file_parser.rb`
に `npm:` 接頭辞から実名を取り出す `parse_alias_package_requirement` / `dealias_package` があるのを確認し、
「Dependabot は実名 `@voidzero-dev/vite-plus-core` として扱うので単独の更新 PR を作る」とユーザーへ報告し、
`.github/dependabot.yml` のコメントにも事実として書いた。

実際は違った。`dealias_package` の呼び出しは `dealias_packages?`
（= `options.fetch(:dealias_packages, false)`）の後ろにあり既定 false。既定経路では
`ignore_requirement?` → `alias_package?` が `npm:` 始まりの requirement を落とすため
（`# TODO: Handle aliased packages` 付き）、エイリアス依存は実名でもエイリアス名でも拾われず PR は
作られない。つまり追加した ignore は既定では no-op で、コメントの断定は誤りだった。
コードレビュー（`/code-review --fix`）で指摘され、コメントと `docs/dependency-policy.md` を書き直す
手戻りになった。

## 根本原因

1. なぜ誤って断定したか → 該当処理を実装コードで見つけた時点で「その経路が通る」と結論した
2. なぜ通ると考えたか → 一次情報（実装）を読んだことを、挙動を測ったことと同じ強さで扱った
3. なぜ同じ強さにしたか → **コードの存在＝経路の有効性**という暗黙の前提を置き、フラグ・オプション・
   experiment・既定値という「到達条件」を経路の一部として数えていなかった ← 根本原因

KEDB 照合（`断定`/`dependabot`/`既定`、`実測`/`フラグ`、`前提`/`一次情報`）では同一原因の記録は無かった。
最も近いのは applied の [[2026-08-04-null-result-needs-proof-of-manipulation]]（陰性結果に操作の成立確認を
付ける）だが、あちらは**自分が実行した操作**の成立確認で、こちらは**他者のコードのどの分岐が既定で実行
されるか**という到達条件の話。AGENTS.md「調査と実験」の「仕様やバージョン規約からの類推は仮説であって
実測ではない」は仕様からの類推を戒めるが、実装を読んだ場合は射程外だった。

## 横断スコープ

同じ構図は、外部ツールの挙動を実装から推定するすべての場面にある。

- dependabot-core を読んで更新挙動を判断する場面（同セッションの pnpm 12 保留判断では
  `--config.minimumReleaseAgeStrict=false` が付く条件まで辿れていた。同じ精度をすべての断定に要求する）
- 上流ツールのガード・チェックが自分の構成で有効か（環境変数・設定ファイル・experiment で無効化される）
- CI・ボットの挙動（条件付き step、paths フィルター、ホスト側の feature flag）

## 提案

外部ツールの挙動を実装コードから断定するときは、**その分岐に到達する条件（既定値・フラグ・オプション・
experiment）を同じ一次情報で確認し、断定文に条件を明記する**（「既定では〜」「〜が有効な場合に限り〜」）。
確認できないときは断定ではなく「経路が有効な場合の想定」として書き、成果物（コード・コメント・
ドキュメント・PR 本文）にもその区別を残す。

反映先は基底ドキュメント `AGENTS.md`「調査と実験」節（パスを絞れない一般規律のため rule にしない）。
既にある「測らずに書いた主張は、後で測った結果が一致していても、提示した時点では根拠を持っていない」の
直後に、実装を読んだ場合の到達条件確認を 1 段足す。
