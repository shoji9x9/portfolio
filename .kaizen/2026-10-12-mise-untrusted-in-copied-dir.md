---
date: 2026-10-12
type: doc
priority: medium
status: pending
applied-to: []
session: claude-code
---

# 複製ディレクトリーでの実験は mise の信頼設定で全滅する

## 事象

Issue #149 で viteplus の厳密一致検査を測るため、本体をスクラッチパッドへ tar で複製し 4 ケースを流した。
複製先の `mise.toml` が未信頼で `mise exec` がすべて `Config files ... are not trusted` で失敗し、
install / build / dev が 1 つも走らないまま「exit=1」が並んだ。空の版表示で気付き再実行した（1 回分の手戻り）。
2026-08-04 の学び（`2026-08-04-null-result-needs-proof-of-manipulation.md`、applied）にも
同じ「一時ディレクトリーで `mise trust` していない」事例がある。

### 再発（2026-11-09、Issue #200）

ghalint の lock を新しい mise で作り直すため、`mise.toml` / `mise.lock` を scratchpad へ複製した。
複製先で lock の一部を消す `python3` を実行したところ、`python3` がグローバル設定の mise shim だったため
`Config files ... are not trusted` で失敗し、後続の `mise lock` も空振りした（1 回の手戻り）。
`MISE_TRUSTED_CONFIG_PATHS` は設定していたが、`python3` の後に export していた。

## 根本原因

1. なぜ全滅? 複製で `mise.toml` ごと持ち出し、mise がパス単位の信頼リストで未登録の設定を拒否した
2. なぜ再発? 2026-08-04 の適用先（AGENTS.md「調査と実験」）は一般規律（操作成立の確認）だけを書き、
   mise 固有の実行形を残さなかった
3. なぜ固有の形が要る? 一般規律は失敗を事後に見つけるだけで、毎回 1 回分の空振りが起きる。
   正しい実行形は事前に書ける
4. なぜ再発（2026-11-09）? 下の旧提案「mise.toml を外す」は、mise.toml 自体が実験対象（lock 生成）のときに使えない
5. `mise exec` だけでなく、グローバル設定で mise 管理している無関係なコマンド（python3 等の shim）も
   cwd の `mise.toml` を評価して失敗する

## 提案

mise 管理下の設定を複製したディレクトリーでは、最初のコマンドより前に `export MISE_TRUSTED_CONFIG_PATHS=<複製先>` を置く（恒久の信頼リストに残す `mise trust` は使わない）。

`mise.toml` が実験に不要なら、従来どおり次の形にする: 本体を複製して mise 管理ツールで実験するときは、複製から `mise.toml` / `mise.lock` を外し、`mise exec node@<版> pnpm@<版> <対象>@<版> --` で版を明示して実行する（`mise trust` は複製先を恒久の信頼リストに残すため使わない）。

- 適用先: AGENTS.md「調査と実験」の隔離の箇条（`mise -C` の例の隣）
- 横断: memory の `mise-c-flag-changes-cwd` と統合を検討する
