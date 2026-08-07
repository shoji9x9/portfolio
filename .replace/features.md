# 機能インベントリ（features）

- 最終更新: 2026-08-07T13:25:00+09:00
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

### 基準の採り直し記録（2026-08-04 / Issue #52）

狭い幅での横スクロールを解消した。現行も同じ挙動を持つが追従させない（上記「移行完了後の扱い」）。
差分検証は「新側の変更前 vs 変更後」で行い、基準は `new/local-dev/baseline-new/` を採り直した。

| 対象                                          | 実施                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `new/local-dev/baseline-new` と `noise-pass2` | 両 slug・両パスを採り直し。自己ノイズは**特性差 0 件・画素差 0・aria 一致**（全 4 組）                                                                                                      |
| `static-page` の全画面寸法                    | desktop 2005×8472 → **1280×8500**、mobile 2005×13761 → **390×15226**。幅の縮小が横スクロールの解消、高さの増加がバッジ行の折り返し                                                          |
| `lapras` の採取寸法                           | desktop 1088×856 → **変化なし（画素差 0）**、mobile 768×856 → **198×258**（プレビュー画像が器に合わせて縮む）                                                                               |
| 旧→新の特性差（`compareTraits`）              | `static-page` desktop 1144 件 / mobile 10083 件、`lapras` desktop 0 件 / mobile 8 件。大半は要素対の水平順序（`kind: geometry` / `prop: horizontal`）で、折り返しで並びが変わったことによる |
| `lapras` mobile 8 件の内訳                    | 幅・高さの変化は修正由来（`lapras.link` 768→198px 等）。`x` 0→96 は修正由来ではなく、旧採取が横スクロール中の座標だったため（desktop は旧も 96）                                            |
| 旧→新の aria スナップショット                 | **全 4 組で完全一致**。構造は変えていない（折り返しと上限幅の変更のみ）                                                                                                                     |
| `metadata.json`                               | 変更なし。`capture_conditions` も `traits.elements` も影響を受けない                                                                                                                        |
| `new/preview/baseline-new`                    | PR #53 のデプロイ（`8bbe201f`）に対して採り直し。自己ノイズは**特性差 0 件・画素差 0**（6 状態すべて）                                                                                      |
| `preview` と `local-dev` の同一性             | 両者の新側採取を直接照合し、**画素差 0・特性差 0・aria 完全一致**（desktop / mobile の default / hover / focus 全 6 状態）                                                                  |

横スクロールの解消は `documentElement.scrollWidth == clientWidth` で確認した（local-dev / Chromium
151.0.7922.34）。測った幅は 320 / 360 / 390 / 485 / 768 / 1280px の 6 点で、すべて一致する。
修正前は Issue 本文の実測どおり 485px で `scrollWidth` 2005px だった。

特性差の件数は差分器 `compareTraits`（`alignTolerance: 1`）の返す件数で、**要素数ではなく
プロパティ単位**である（1 要素が複数件を生む）。要素単位で数えると値が 1 桁小さくなるため、
記録・比較はこの標準の数え方に揃える。`preview` の `noise.json` も同じ関数で算出した。

#### この指標だけでは足りない（潰れは別に測る）

`scrollWidth == clientWidth` は「収まっている」ことの証拠にはならない。器より広い flex アイテムは
横スクロールを作らずに縮むため、バッジ画像が `h-5` のまま横だけ潰れて読めなくなっても等号は成立する。
そこで同じ 6 点で各バッジ画像の**描画幅 / 自然幅**も測った。

| 幅                       | 潰れたバッジ                                                               |
| ------------------------ | -------------------------------------------------------------------------- |
| 390 / 485 / 768 / 1280px | **0 件**                                                                   |
| 360px                    | 2 件（最小 93%）                                                           |
| 320px                    | 27 件（最小 59%。職務経歴・製作物カード内。例: GitHub Actions 68 / 115px） |

320px の潰れは `<main>` の `p-24` が幅によらず左右 96px を占め、カード内バッジ行の器が 60px しか
残らないことによる。`p-24` の見直しは本 Issue の範囲外と決めた（着手時にユーザーが範囲を選択）。

この指標を測ったことで、初回実装のアカウントセクション取りこぼしを検出できた。`src/App.tsx` が
`BadgeRow` を使わず独自の `flex items-center` を持っていたため折り返さず、485px で 5 件すべてが
自然幅の 75%、390px で 51%、320px で 33% に潰れていた。横スクロールは出ないので
`scrollWidth == clientWidth` では素通りする。リンク付きバッジも `BadgeRow` を通すよう直し、
折り返し方針を 1 箇所に集約した（DOM は同一のため aria スナップショットは変わらない）。

判断の宣言は設定 `intentional_diffs.may_change`「狭い幅で横スクロールを発生させない（新側のみ）」。

### 基準の採り直し記録（2026-08-07 / Issue #58）

資格「AWS Certified Solutions Architect - Associate」を追加した（ゴールデンデータセット version 3 → 4）。
差分検証は「新側の変更前 vs 変更後」で行い、基準は `new/local-dev/baseline-new/` を採り直した。

| 対象                                          | 実施                                                                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `new/local-dev/baseline-new` と `noise-pass2` | 両 slug・両パスを採り直し。自己ノイズは**特性差 0 件・画素差 0・aria 一致**（`static-page` 6 組・`lapras` 2 組の全 8 組）                     |
| `static-page` の全画面寸法                    | desktop 1280×8500 → **1280×8524**（+24px＝項目 1 行）、mobile 390×15226 → **390×15298**（+72px＝項目 3 行の折り返し）。幅は不変               |
| `lapras` の採取寸法                           | desktop 1088×856 / mobile 198×258 とも**変化なし**（旧→新の画素差 0・特性差 0・aria 一致）。`full_page: false` で資格セクションを含まないため |
| 旧→新の aria スナップショット                 | `static-page` の desktop / mobile とも**追加された 1 行のみ**（`- listitem: AWS Certified Solutions Architect - Associate`）。他の行は不変    |
| 旧→新の特性差（`compareTraits`）              | `static-page` desktop 3 件 / mobile 5 件、hover・focus 状態は 0 件、`lapras` 0 件。内訳と実測値は下表                                         |
| `metadata.json`                               | `traits.elements` に `qualifications.group.3.item.2` を追加し `element_count` 178 → **179**。`capture_conditions` は変更なし                  |
| `new/preview/baseline-new`                    | PR #61 のデプロイ（`b993bcd` / `78dea5fe`）に対して採り直し。自己ノイズは**特性差 0 件・画素差 0**（6 状態すべて）                            |
| `preview` と `local-dev` の同一性             | 両者の新側採取を直接照合し、**画素差 0・特性差 0・aria 完全一致**（desktop / mobile の default / hover / focus 全 6 状態）                    |

特性差 8 件はすべて追加項目で説明できる。y 座標・高さの実測値（採取した `traits.json`）で確認した。

| 差分                                                                   | 実測値による説明                                                                                                                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qualifications.group.3.item.2`（`kind: missing` / absent → present）  | 追加した項目そのもの。desktop `y=6472.8 h=24`、mobile `y=12781.6 h=72`                                                                                                     |
| `qualifications.group.3 \| ...item.1` の `vertical` と `bottomAligned` | 分類 AWS が 1 項目から 2 項目になり、器の高さが desktop 48→72 / mobile 72→144 へ伸びた。中心が項目 1 より下がるため `lt` → `eq`（desktop）/ `gt`（mobile）、下端一致も解消 |
| mobile のみ `section.qualifications \| group.2` 系 2 件                | 資格セクションの高さが 432→504 で中心が +36px 下がり、分類 2（JDLA、中心 12661.6）との上下関係が反転した。desktop は +12px で反転しないため 0 件                           |

資格セクションと分類 2 の `y` 座標は前後で不変（desktop 6184.8 / 6352.8、mobile 12421.6 / 12613.6）で、
追加位置より上の要素は動いていない。hover / focus 状態の要素クロップも全 12 枚で画素差 0。

`local-dev` の `network.json` は両 slug で差分が出るが、vite 開発サーバーの `?t=<epoch>` と依存最適化の
`?v=<hash>` だけで、これらを除いたリクエスト集合（URL・method・resourceType・status）は完全に一致する。
描画の成果物ではない。

`preview` の `network.json` は本番ビルドのため事情が違う。デプロイ固有ホストの変化に加えて、
**JS バンドルのコンテンツハッシュが `index-DQKyNJMB.js` → `index-BPjT1kF_.js` へ変わった**（データが
変わったので当然）。**CSS は `index-Cp39JzXO.css` のまま**で、スタイルを変えていないことと整合する。
ホストとバンドルハッシュを伏せて比較すると、リクエスト集合・method・status・resourceType は完全一致する。

`preview` は `local-dev` と違い、自己ノイズの 2 回目採取（`noise-pass2/`）の生データを残さず、要約
（`baseline-new/noise.json`）だけを保持する（従来どおり）。`noise.json` の変化は `pixel_total` のみで、
desktop 10,880,000 → 10,910,720（1280×8524）、mobile 5,938,140 → 5,966,220（390×15298）。全画面の
高さが伸びた分と一致する。`pixel_diff` と `trait_diffs` は 6 状態すべて 0 のまま。

`lapras` の `preview` ベースラインは従来どおり未採取（#31 / #52 でも採っていない）。今回の変更で
`lapras` は `local-dev` の実測で画素差 0・特性差 0・aria 一致だったため、採取対象を広げていない。

判断の宣言は設定 `intentional_diffs.may_change`「資格の追加（新側のみ）」。

## 分解の変更履歴

- 2026-07-28: 7 単位（`profile` / `badges` / `careers` / `artifacts` / `static-content` / `lapras` / `lapras-preview`）から
  上記 2 単位へ併合した（Issue #21）。理由は 2 つ。
  - 前 5 者は単一ページ `/` の**表示セクション**単位の分割であり、利用者目的・データ境界・依存関係・副作用の
    所有者のいずれでも分かれない。分解基準（表示セクション単位で分けない）に反しており、同じページに対する
    ベースライン採取と `parity-diff` の往復を 5 回繰り返すことになっていた。
  - `lapras-preview` は fan-out が 1 で、横断 API の基準を満たさない（旧インベントリ自身がその旨を注記していた）。

  Issue も併せて併合した。#11〜#15 → #22、#10・#16 → #23。旧 Issue は併合先への参照コメントを付けて
  `not planned` で close した。
