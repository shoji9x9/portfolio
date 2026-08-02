# 差分レポート（diff）

- 対象 slug: `lapras`
- 対象 target: `local-dev`
- モード: `feature`
- 実施日時: 2026-07-31T12:41:00+09:00
- 読んだ `replace-metadata.json` の `loop.iterations`: 0

## 1. 前提確認の結果

| 前提 | 確認値 | 判定 |
| --- | --- | --- |
| replace-strategy setup | 設定・`features.md` とも存在 | OK |
| target の稼働確認 | 5173 は別アプリ使用中。portfolio を 5174 で起動し、URL を固定 | OK |
| parity-suite 完了 | `current_green: true` / `validated_by_strength_gate: true` | OK |
| parity-replace 新側 green | `local-dev` / `new_green: true` | OK |
| データセットバージョン三者一致 | dataset 2 / suite 2 / phase B lapras local-dev 2 | 一致 |
| 条件一致 | 2 viewport・animation 無効・LAPRAS本体＋画像全体・default | OK |
| 新側自己ノイズ | desktop / mobile とも画素 0・特性 0・ARIA 0 | OK |
| 差分器バージョン | metadata 記録の VERSION 1 / tolerance 1 / threshold 0.1 | 一致 |

## 2. 経路別サマリ

| 経路 | 適用したノイズ基準値 | 生の検出 | 正規化後の未説明 |
| --- | --- | ---: | ---: |
| 画素 | `/` / default / desktop・mobile = 0 | 0px | 0 |
| 特性照合 | 同上、trait 0 | 8 件 | 0 |
| ARIA | — | 0 | 0 |

## 3. 差分一覧

| ID | 経路 | ビューポート | 位置 | 内容 | 正規化結果 | 分類 | 根拠 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T-001〜008 | 特性照合 | desktop / mobile | LAPRAS section / heading / link / image | `font-family` の名前 | `absorbed_T` | 許容（宣言済み） | `component_diffs`「本文フォント（全要素）」と current/new 値が完全一致 |

画素は `section.lapras` 本体と `lapras.image` 全体を縦に連結したキャプチャ
（desktop 1088×856、mobile 768×856）で両 viewport とも 0。
mobile の画像はセクション枠から横にはみ出すが、画像全幅 768px を別キャプチャとして含めた。
ARIA は LAPRAS 見出しと画像リンクの機能境界で両側とも 0。
`diff-normalize.mjs` VERSION 2 は desktop / mobile 各 4 件をすべて `absorbed_T` とし、
終了コード 0 だった。

## 4. 要対応

該当なし。`on_diff` 文書はなく、parity-replace への差し戻しもない。

## 5. 許容

新たな許容判断はない。特性 8 件は 2026-07-29 承認済みの
`component_diffs`「本文フォント（全要素）」で吸収した。

## 6. 未検証領域

| 箇所 | 理由 |
| --- | --- |
| LinkPreview API の実応答・エラー別本文 | 秘密鍵を要する外部連携。固定依存の単体テストで代替 |
| Cloudflare Cache API のデータセンター間伝播 | ローカルでは分散状態を作れない |
| 撮影環境の自由記述 | 機械照合できない。同一 Linux Chromium 条件での比較のみ |
| 想定利用者の Windows Chrome | 今回は Linux Chromium のみ |
| アニメーション中の見た目 | `animations: disabled` で採取 |

## 7. 収束判定

- 未説明差分: 0
- 未修正回帰: 0
- 未承認の許容候補: 0
- 収束: `converged: true`
