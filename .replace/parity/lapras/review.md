# レビュー記録（review）

- 対象 slug: `lapras`
- 実施日時: 2026-07-31T12:43:00+09:00

## レビュー対象（差分の範囲）

| 範囲 | 内容 |
| --- | --- |
| Issue #23 の未コミット差分一式 | Pages Function、LAPRAS UI、データ写像、単体テスト、パリティスイート、設計・証跡 |

レビュー役には `git diff` と未追跡ファイルの `git diff --no-index /dev/null <path>` だけを渡し、
実装意図は渡していない。

## ラウンドごとの指摘と対応

| ラウンド | 指摘（動かない理由） | 対応 | 再レビュー結果 |
| --- | --- | --- | --- |
| 1 | 新側ブラウザーテストが API を常時モックし、Pages Function adapter もカバレッジ除外のため配線切れを見逃す | adapter をカバレッジ対象へ戻し、binding・Cache・fetch・`waitUntil` の直接単体テストを追加。Wrangler 実起動でも固定 503 を確認 | 解消 |
| 1 | mobile と名付けた ARIA テストが project 既定の desktop viewport のまま | viewport ごとの `test.describe` で `test.use({ viewport })` を設定 | 解消 |
| 1 | `context.waitUntil` を非束縛で渡すと、実 runtime の receiver check で成功経路が失敗しうる | closure 内から `context.waitUntil(promise)` を呼び、receiver-sensitive test を追加 | 解消 |
| 2 | 指摘なし | — | キャプチャ範囲変更後に再レビュー |
| 3 | static-page をマスクしても full-page の総高と `page.main` 特性に依存する。static-page 再検証の commit / URL も実測と不一致 | `page.main` を除外し、LAPRAS 専用キャプチャへ変更。static-page 証跡を 5174 / 8788・`e6494eca...` 上の未コミット作業ツリーへ統一 | 解消 |
| 4 | mobile の固定幅画像が section 枠からはみ出し、section screenshot では右側約 570px が欠落する | section 本体と image 全体を同条件で別撮影して縦連結。実測を desktop 1088×856・mobile 768×856 で再採取 | 解消 |
| 5 | 指摘なし | — | 最終判定へ |

## 最終判定

- 判定: 指摘が尽きた
- 備考: 測定範囲修正後の全未コミット差分を同じ別エージェントが再レビューし、追加指摘なし
