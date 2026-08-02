# 承認済みインスタンス例外の根拠

- 対象 slug: `static-page`
- 最終更新: 2026-07-31

## font-subset-weight600

- **識別ラベル**: フォントのサブセットビルド差による weight 600 のラスタライズ差
- **インスタンス件数**: 9

### なぜ `component_diffs`（系統差 T）で宣言できないか

現・新で computed style の `font-family` は系統差 T で正規化済みであり、画素以外の font 関連の値は一致する。残る差はラスタライズだけなので、T の照合キーである `property` / `current` / `new` では表せない。

### 原因調査と bbox の再実測

既存の調査では、現行と新側はともに Inter 3.019・ヒンティング命令なしで送り幅は 18 サンプルすべて一致した。一方、現行は Google Fonts 由来で `gasp` テーブルを持ち、新側の `inter-ui` 3.19.3 は rsms リリース由来で `gasp` テーブルを持たない。weight 600 の輪郭濃度だけが変わり、weight 400 では画素差が出なかった。

2026-07-31 に `local-dev`（Chromium / Linux (WSL) / devicePixelRatio 1 / light、default 状態）で新側を再採取し、現側の同じ viewport と比較した。LAPRAS 未実装に由来する領域を除き、以下の bbox を実測した。座標は現側スクリーンショットを新側の高さに切り揃えた crop 基準である。

| ビューポート | 要素 | bbox（x,y,w,h） | 差分画素数 |
| --- | --- | --- | ---: |
| desktop | `careers.project.toyota-outsystems.heading` | `189,3096,3,1` | 3 |
| desktop | `careers.project.toyota-outsystems.heading` | `237,3096,3,1` | 3 |
| mobile | `self-promotion.item.3` | `170,1002,1,1` | 1 |
| mobile | `careers.project.freelance-sales` | `232,2208,1,1` | 1 |
| mobile | `careers.project.toyota-outsystems.heading` | `189,5793,3,1` | 3 |
| mobile | `careers.project.toyota-outsystems.heading` | `237,5793,3,1` | 3 |
| mobile | `careers.project.toyota-outsystems` | `221,6667,1,1` | 1 |
| mobile | `qualifications.group.2.item.1` | `136,7993,1,1` | 1 |
| mobile | `qualifications.group.3.item.1` | `142,8098,1,1` | 1 |

### 許容の根拠と代替案

差は字形の位置・並びではなく輪郭濃度だけであり、現行の WOFF2 を pnpm 管理外で vendoring しない限り源流で消せない。既存のユーザー承認範囲を bbox 単位へ移行するもので、許容範囲は拡張していない。

### ユーザー承認

| 承認日時（ISO 8601） | 承認時に提示した判断材料 | 備考 |
| --- | --- | --- |
| 2026-07-29 | Inter 3.019 の版・ヒンティング・送り幅の調査と、desktop 6px / mobile 11px の crop 対 | 旧設定の 7 行を、再実測した 9 bbox インスタンスへ分解して移行した。 |

## self-promotion-mobile-1px-rasterization

- **識別ラベル**: 自己PR本文の目視で識別できない 1px ラスタライズ差
- **インスタンス件数**: 1

### なぜ `component_diffs`（系統差 T）で宣言できないか

現・新で対象テキストの位置・折返し・要素サイズ・computed style は一致し、画素経路だけが検出した
1px の差である。値の差を照合する `component_diffs` のキーでは表せないため、bbox を照合キーとする
インスタンス例外に記録する。

### 観測条件

| 要素 | ビューポート・状態 | フォント条件 | bbox | 観測結果 |
| --- | --- | --- | --- | --- |
| `self-promotion.item.4` | mobile 390×844 / default | Inter 16px / weight 400 | `157,1218,1,1` | 文字輪郭の濃度だけが 1px 異なる。位置・折返し・要素サイズ・computed style は一致 |

原因を既存の `font-subset-weight600` へ一般化できる根拠はないため、別の 1 インスタンスとして限定する。

### 許容の根拠

対象は目視で識別できない 1px の濃度差であり、ユーザーが許容を承認した。LAPRAS セクション・画像を
含む他の領域にはこの例外を適用しない。

### ユーザー承認

| 承認日時（ISO 8601） | 承認時に提示した判断材料 | 備考 |
| --- | --- | --- |
| 2026-07-31T15:58:19+09:00 | mobile 390×844、`self-promotion.item.4`、bbox `157,1218,1,1`、位置・折返し・computed style 一致、輪郭濃度のみ 1px 差 | ユーザー発言: 「上記は目視では気付けない程度なので許容します」 |
