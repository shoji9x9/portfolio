# 新側ロケータマッピング（porting）

- 対象 slug: `lapras`
- target: `local-dev`
- 実施日: 2026-07-31

## 判定

新側例外は 0 件。現側は role を持たない `main > div` を見出しで絞る
`e2e/parity/lib/locator-map/current.ts` が必要だが、新側は既存の
`PortfolioSection` が `section + aria-labelledby` を出すため、
`e2e/parity/lib/locator-map/static-page.new.ts` の role ベース解決をそのまま利用できる。

LAPRAS 内部の見出し、画像リンク、画像は
`e2e/parity/lib/locator-map/portable.ts` の `laprasEntries` が両側共通で解決する。
したがって `lapras.new.ts` は作成しない。
