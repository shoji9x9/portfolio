# 機能インベントリ（features）

- 最終更新: 2026-08-04T14:01:00+09:00
- ゴールデンデータセット Issue: #9

## 機能一覧

| slug          | 機能名                 | 依存順 | ページ | 新規実装 API                                | 依存する横断 API（リソース slug） | テーブル | 副作用出力                                                         | Issue | 状態   |
| ------------- | ---------------------- | -----: | ------ | ------------------------------------------- | --------------------------------- | -------- | ------------------------------------------------------------------ | ----- | ------ |
| `static-page` | ポートフォリオ静的表示 |      1 | `/`    | なし                                        | なし                              | なし     | 外部画像 GET（対象）                                               | #22   | closed |
| `lapras`      | LAPRAS プレビュー      |      2 | `/`    | `GET /api/lapras-preview`（Pages Function） | なし                              | なし     | 現行 linkpreview.net GET（gaps）、新側 LAPRAS HTML・media 画像 GET | #23   | closed |

`static-page` が含む表示内容: プロフィール、アカウント・保有スキルのバッジ、職務経歴詳細、製作物、自己 PR・資格・希望条件。

## 横断 API（リソース単位）

該当なし。

`GET /api/lapras-preview` は `lapras` 機能からのみ利用され（fan-out = 1）、横断 API の基準（2 つ以上の機能が利用する
リソース）を満たさない。そのため横断 API 表には載せず、`lapras` の「新規実装 API」に含める。外部取得を
静的コンテンツから分離するという Issue #3 由来の設計判断は維持し、`lapras` Issue の内部フェーズ（API 先行 → UI）
として表現する。

## バッチ

現行にバッチ・スケジュール実行はない。

## 移行完了後の扱い（2026-08-04 / Issue #31）

両機能が収束し（#22 は 2026-07-29、#23 は 2026-08-02 に close）、本番は Cloudflare で稼働している。
これ以降のコンテンツ更新では現行 shoji9x9.github.io を追従させないと決めた。影響は次のとおり。

- **凍結するのは現側の採取物だけ**——`.replace/parity/<slug>/baseline/` と `strength-results.json`。
  これらは移行完了時点の証跡なので更新しない。採取当時の `metadata.json`（ブラウザー版・論理名一覧）は
  git 履歴から読む。
- **`metadata.json` は凍結しない。** 新側採取（`baseline-new.spec.ts`）が実行時に読む入力
  （`capture_conditions.*` と `traits.elements`）だからで、凍結すると新側基準を採り直せなくなる。
  内容やブラウザーを変えたら、記録値の更新と `baseline-new` の採り直しを対で行う。
- **パリティスイートの `--project=current` は以後 green にならない。** 期待値をゴールデンデータセット
  （＝新しい正本）から引くため。現行と一致していた事実は上記の証跡が示す。
- **`--project=new` は回帰スイートとして使い続ける。** 新側の表示が正本どおりかを検証する。
- 差分検証は「現行 vs 新側」ではなく「新側の変更前 vs 変更後」で行う
  （基準は `.replace/parity/<slug>/new/<target>/baseline-new/`）。ブラウザー陳腐化ガードの新側の
  手当ても、現行側の再採取を要さない形へ直した（`e2e/parity/lib/browser-version.ts`）。

### 基準の採り直し記録（2026-08-04 / Issue #31）

| 対象                                          | 実施                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `capture_conditions.browser`（両 slug）       | Playwright 1.61.1 / Chromium 149.0.7827.55 → **1.62.0 / 151.0.7922.34**（実行中の値）                                                   |
| `traits.elements`（`static-page`）            | 136 → **178**（新 4 案件・新 10 バッジを追加、`artifacts.card.portfolio.article-link` と `tech.nextjs` を削除）                         |
| `new/local-dev/baseline-new` と `noise-pass2` | 両 slug・両パスを採り直し。自己ノイズは**特性差 0 件・画素差 0**（desktop 2005×8472 / mobile 2005×13761）                               |
| `new/preview/baseline-new`                    | PR #51 のデプロイ（`fcbeb8cc`）に対して採り直し。自己ノイズは**特性差 0 件・画素差 0**（6 状態すべて）                                  |
| `preview` と `local-dev` の同一性             | 両者の新側採取を直接照合し、**画素差 0・特性差 0・aria 完全一致**（desktop / mobile）。本番ビルドと Cloudflare 配信を経ても差は増えない |

`preview` の `network.json` だけはデプロイ固有ホスト（`https://<デプロイ ID>.shoji9x9.pages.dev`）を
含むため、push のたびに記録値と現デプロイがずれる。これは `preview` の性質で、採り直しでは解消しない
（今回も採取時は `fcbeb8cc`、その採取物を commit した時点で `44e139d9` へ変わった。採り直し前の記録は
さらに前の `b7b8d054` だった）。描画の成果物（aria・特性・スクリーンショット）はアプリのソースが
変わらない限り不変なので、`preview` の比較基準として意味を持つのはそちらである。ホストの陳腐化を
回帰と読み違えない。

判断の宣言は設定 `intentional_diffs.may_change`「移行完了後のコンテンツ更新（新側のみ）」、
データ側の意味は [`references/static-data-semantics.md`](references/static-data-semantics.md)。

## 分解の変更履歴

- 2026-07-28: 7 単位（`profile` / `badges` / `careers` / `artifacts` / `static-content` / `lapras` / `lapras-preview`）から
  上記 2 単位へ併合した（Issue #21）。理由は 2 つ。
  - 前 5 者は単一ページ `/` の**表示セクション**単位の分割であり、利用者目的・データ境界・依存関係・副作用の
    所有者のいずれでも分かれない。分解基準（表示セクション単位で分けない）に反しており、同じページに対する
    ベースライン採取と `parity-diff` の往復を 5 回繰り返すことになっていた。
  - `lapras-preview` は fan-out が 1 で、横断 API の基準を満たさない（旧インベントリ自身がその旨を注記していた）。

  Issue も併せて併合した。#11〜#15 → #22、#10・#16 → #23。旧 Issue は併合先への参照コメントを付けて
  `not planned` で close した。
