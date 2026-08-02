# 未検証領域（gaps）

- 対象 slug: `lapras`
- 実施日時: 2026-07-31T11:55:00+09:00
- 現行条件: `current-prod`、commit `b10b54a489fbac94f7bf8beef1a005ffe19ee791`

## 現行 API 特性と新側との差

現行ソースの `app/page.tsx` を上記 commit で確認した。静的エクスポートのビルド時に
`http://api.linkpreview.net/?key=<秘密値>&q=<公開 URL>` を呼び、JSON 全体をログへ出した後、
`url` / `image` / `title` を検証せず表示する。非 2xx・JSON 解析失敗・秘密値不足を個別に扱う
分岐、キャッシュ制御、画面上のフォールバックは存在しない。

新側のLAPRAS公開ページからの実行時取得、HTTPS、24時間キャッシュ、検証済みOGフィールドだけの返却、
固定 503 とテキストリンクへのフォールバックは、2026-07-31 に承認された意図的差異である。
新側 API の成功・失敗・キャッシュ特性は `functions/_lib/lapras-preview.test.ts`、
画面の 503 フォールバックは `e2e/parity/lapras/states.spec.ts` で検証する。

## Preview 環境での外部取得再検証

2026-08-02、Cloudflare Pages Preview で実際に差が出た条件を使って再検証した。

- 同じ32バイトのAPIキーはローカル `curl` からLinkPreview APIへ送ると200、Pages Functionからは403
- salted SHA-256 fingerprint はローカルとSecret bindingで一致し、ダミー値による受信確認でも
  `X-Linkpreview-Api-Key` は欠落・変換されなかった
- `Accept` と `User-Agent` をローカル成功時に揃えてもPages Functionからの403は継続した
- Pages FunctionからLAPRAS公開ページを直接取得すると200で、必要なOGメタデータ3件を取得できた

この結果から新側はLinkPreview APIを使わず、固定したLAPRAS公開URLのHTMLからOGメタデータを取得する方式へ
変更した。実デプロイに対する非モックのPreviewスモークで、Function 200、画像200、desktop/mobile表示、
console errorゼロを検証する。

## 特性化できなかった箇所と理由

| 箇所 | 種別 | 理由 | 対応 |
| --- | --- | --- | --- |
| 現行 LinkPreview API の実応答・エラー別本文 | スコープ外の外部連携 | 秘密鍵を要し、現行公開ページの閲覧ではビルド時通信へ到達できない | 応答を推測せず gap として残す。新側はLinkPreviewへ依存せず、LAPRAS公開ページのHTTPエラー・不正HTML・接続失敗を単体テストで検証 |
| 現行の取得失敗画面 | 到達不可 | 失敗分岐がなく、公開済み静的成果物からビルド失敗状態を再現できない | 未検証として残し、新側だけ承認済みフォールバックを検証 |
| Cloudflare Cache API のデータセンター間伝播 | 実行環境依存 | Cache API はデータセンターごとのキャッシュで、ローカル Playwright から分散状態を作れない | 24 時間 TTL と hit/miss は単体テスト、実環境の伝播は未検証 |
| 明示的な loading indicator | 明示的な loading UI 無し | 現行はビルド済み画像を即時表示し、新側も取得中はフォールバックリンクを表示する設計 | indicator 自体は対象外。取得中もリンクが残ることは単体描画で検証 |
| 想定利用者環境のラスタライズ | 採取環境依存 | Linux Chromium で採取し、Windows Chrome とはフォント・画像のラスタライズが異なりうる | 採取条件内の一致だけを判定し、利用者環境差は未検証 |

## hermetic でないテスト一覧

該当なし。現行サイトは読み取り専用で、外部画像 GET 以外の副作用を起こさない。

## 強度ゲートで素通りした故障種別

該当なし。カタログ化した 3 種はすべて検出した。

## 宣言できない構造差

該当なし。
