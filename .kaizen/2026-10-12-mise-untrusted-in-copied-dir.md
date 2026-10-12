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

## 根本原因

1. なぜ全滅? 複製で `mise.toml` ごと持ち出し、mise がパス単位の信頼リストで未登録の設定を拒否した
2. なぜ再発? 2026-08-04 の適用先（AGENTS.md「調査と実験」）は一般規律（操作成立の確認）だけを書き、
   mise 固有の実行形を残さなかった
3. なぜ固有の形が要る? 一般規律は失敗を事後に見つけるだけで、毎回 1 回分の空振りが起きる。
   正しい実行形は事前に書ける

## 提案

本体を複製して mise 管理ツールで実験するときは、複製から `mise.toml` / `mise.lock` を外し、`mise exec node@<版> pnpm@<版> <対象>@<版> --` で版を明示して実行する（`mise trust` は複製先を恒久の信頼リストに残すため使わない）。

- 適用先: AGENTS.md「調査と実験」の隔離の箇条（`mise -C` の例の隣）
- 横断: memory の `mise-c-flag-changes-cwd` と統合を検討する
