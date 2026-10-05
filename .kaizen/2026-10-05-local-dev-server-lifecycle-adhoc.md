---
date: 2026-10-05
type: other
priority: medium
status: pending
applied-to: []
session: claude-code
---

# パリティスイート用 dev サーバーの起動・停止が場当たりで壊れた

## 事象

- 起動: `pnpm dev > "$TMPDIR/dev.log" &` が TMPDIR 未定義で `/dev.log` に展開され
  Permission denied。サーバー無しのままスイートが走った
- 停止: `pkill -f "vp dev"` が自分自身の bash（コマンド行に
  "vp dev" を含む）を kill して exit 144。サーバーは残り、
  ss でポートから PID を引き直して止めた

## 根本原因

1. なぜ壊れた? 起動・待機・停止をその場のシェルで書いた
2. なぜ場当たり? docs/quality-checks.md は
   `PARITY_NEW_UI_URL=http://localhost:5173` で実行とだけ書き、
   サーバーのライフサイクルは利用者任せ
3. なぜ任せた? URL を env で外から渡す設計にした結果、
   local-dev の起動管理がスイートの外に落ち、
   playwright.config.ts に webServer が無い

## 提案

テスト対象のローカルサーバーは場当たりのシェルで起動・停止せず、
フレームワークの管理機構（Playwright webServer 等）か
リポジトリーのスクリプトに任せる。手で止めるときは
`pkill -f` を使わずポート→PID で特定する。

- playwright.config.ts: PARITY_NEW_TARGET=local-dev のときだけ
  webServer（`pnpm dev`、url 待機、reuseExistingServer）を有効化
- docs/quality-checks.md の実行例を更新
- 横断: playwright.preview.config.ts・browser-test の
  local 環境手順も同じ前提か確認する
