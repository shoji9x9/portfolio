---
date: 2026-09-19
type: rule
priority: medium
status: applied
applied-to: [".github/dependabot.yml", "#119"]
session: claude-code
---

# 版を揃える必要がある依存群は Dependabot の groups で束ねる

## 事象

PR #116 で Dependabot が react / @types/react だけを 19.3.0 に上げ、react-dom は 19.2.8 のまま残した。
react-dom/server の版一致検査（`Incompatible React versions`）で 2 スイートが読み込み失敗し、CI が落ちた。
ブランチ上で react-dom / @types/react-dom を手で 19.3.0 へ揃えて解消した。

## 根本原因

- なぜ落ちた? react と react-dom の版がずれた
- なぜずれた? `.github/dependabot.yml` に react 系の group が無く、Dependabot が依存ごと
  （react + @types/react の複合 PR）に分割した
- なぜ group が無い? 版を揃える必要のある依存群を洗い出す規律が、playwright の実害（#38 / #42）後の
  個別対応に留まり、横断で見直していなかった

横断スコープ: 同種の lockstep 依存（react / react-dom と @types/react / @types/react-dom、
vitest / @vitest/coverage-v8 等）。

## 提案

版を揃えないと動かない依存群（ピア同版要求）は、実害を待たず `dependabot.yml` の groups で束ね、patch グループより前に置く。

具体: groups に react（react, react-dom, @types/react, @types/react-dom）を追加し、他の lockstep 候補（vitest 系等）も洗い出す。
