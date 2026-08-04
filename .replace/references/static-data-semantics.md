# 静的データの形式対応と意味論差（static-data-semantics）

設定 `skills.replace-strategy.references.db_semantics` の実体。`dataset_mode: static` における
「現行の静的データ形式 → 新側の静的データ形式」の対応と意味論差を定める。`golden-dataset` の
フェーズ B が写像設計と現新一致検証で読む。

- 最終更新: 2026-08-04
- 現行の形式: `shoji9x9/shoji9x9.github.io` の `services/*.ts`（TypeScript のオブジェクト・配列リテラル）
- 論理データ（フェーズ A の正本）: `seed/data/*.json`
- 新側の形式: `src/data/generated/*.json`（スキーマの正本は `src/data/types.ts`、写像の実装は `seed/phase-b.ts`）

## 論理データの役割の変更（2026-08-04 / Issue #31）

移行機能 Issue #22（静的コンテンツ）・#23（LAPRAS）が収束し本番へ切り替わったため、論理データの契約を
**「現行 shoji9x9.github.io の忠実な再現」から「ポートフォリオの正本」へ変えた**。現行サイトは以後
追従させない。

この変更で何がどうなるかを取り違えないよう、影響を明示する。

| 対象                                        | 変更後                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 論理データ（`seed/data/`）                  | ポートフォリオに表示したい内容そのもの。現行サイトの値と一致する義務は無くなった                                                |
| フェーズ B の写像・現新一致検証             | **変わらない**。論理データ → 新側の写像規則と、宣言済み意図的差異だけが差でありうるという検証はそのまま有効                     |
| パリティスイート（`--project=current`）     | 期待値を論理データから引くため、**以後 green にならない**。現行と一致していた事実は移行時点の成果物が示す                       |
| パリティスイート（`--project=new`）         | 引き続き有効。新側の表示が正本どおりかを検証する回帰スイートとして使う                                                          |
| `.replace/parity/*/baseline/`（現側採取物） | 移行完了時点の証跡として凍結する。更新しない                                                                                    |
| 今後の差分検証                              | 「現行 vs 新側」ではなく「新側の変更前 vs 変更後」で行う（`.replace/parity/*/new/<target>/baseline-new/` を基準にした回帰比較） |

宣言は設定 `intentional_diffs.may_change`「移行完了後のコンテンツ更新（新側のみ）」。

## ファイル対応

| 論理データ（フェーズ A）        | 新側（フェーズ B）                       | 備考                                                                           |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| `seed/data/profile.json`        | `src/data/generated/profile.json`        | 形式は同一                                                                     |
| `seed/data/badges.json`         | `src/data/generated/badges.json`         | 群の構成は同一。値に意図的差異あり（後述）                                     |
| `seed/data/careers.json`        | `src/data/generated/careers.json`        | 技術スタック参照の表現が異なる（後述）                                         |
| `seed/data/artifacts.json`      | `src/data/generated/artifacts.json`      | 同上                                                                           |
| `seed/data/static-content.json` | `src/data/generated/static-content.json` | 資格と希望条件の表現が異なる（後述）                                           |
| `seed/data/lapras.json`         | `src/data/generated/lapras.json`         | `publicUrl` のみ写像。`preview` は外部 API の gap を表すため新側へ持ち込まない |

## 型・表現形式の対応

いずれも**表現形式の変換であって値の意味は変えない**。

### 1. 技術スタックの参照を「表示名」から「安定 ID」へ

現行および論理データは、プロジェクト・製作物の技術スタックをバッジの**表示名**（`"TypeScript"`）で
参照する。新側は**安定 ID**（`"typescript"`）で参照する。

```text
論理データ  careers[].projects[].techStack.items: ["TypeScript", "PHP"]
新側        careers[].projects[].techStack.items: ["typescript", "php"]
```

理由は 2 つ。

- 表示名は意図的差異の対象になりうる（下記 GitHub 綴り）。表示名で参照すると、綴りを変えた瞬間に
  参照が壊れる
- 安定 ID は `^[a-z0-9-]+$` に固定されており、フェーズ A の検証で一意性が保証されている

**写像規則**: 論理データの `badges.language` / `badges.framework` を表示名で索き、その `id` へ置換する。
索けない表示名があれば**失敗**として扱う（黙って読み飛ばさない）。

### 2. 資格の分類をオブジェクトから配列へ

論理データは分類名をオブジェクトのキーで表す。新側は順序を明示するため配列にし、安定 ID を持たせる。

```text
論理データ  staticContent.qualifications: { "情報処理推進機構 (IPA)": ["基本情報技術者", ...], ... }
新側        staticContent.qualifications: [ { id: "ipa", name: "情報処理推進機構 (IPA)", items: [...] }, ... ]
```

**写像規則**: `Object.entries()` の列挙順（＝挿入順）を配列順とする。分類の安定 ID は下表で固定する
（分類名から機械的に導出すると日本語を含むため `^[a-z0-9-]+$` を満たせない）。

| 分類名                            | 安定 ID  |
| --------------------------------- | -------- |
| 情報処理推進機構 (IPA)            | `ipa`    |
| 日本ディープラーニング協会 (JDLA) | `jdla`   |
| AWS                               | `aws`    |
| その他                            | `others` |

### 3. 希望条件を 2 つのフィールドからオブジェクトへ

```text
論理データ  staticContent.desiredWorkTitle / staticContent.desiredWorkUrl
新側        staticContent.desiredWork: { title, url }
```

### 4. アカウントバッジの `href` を必須にする

論理データの `Badge.href` は任意（言語・フレームワークのバッジは持たない）。新側は群ごとに型を分け、
`account` の要素だけ `href` 必須の `AccountBadge` とする。値の意味は変わらない。

### 5. LAPRAS の公開 URL だけを新側へ写像する

論理データの `lapras.publicUrl` は、失敗時フォールバックとプレビュー画像リンクの共通リンク先として
`src/data/generated/lapras.json` へ写像する。`lapras.preview` は
「LinkPreview API の秘密鍵を要する応答はデータセットへ収録しない」という gap の記録なので、
新側の実行時データへは写像しない。

### 6. 製作物の `article` は任意項目

論理データの `artifacts[].article` は任意。記事を書いていない製作物は**キーごと持たない**。
新側も同じで、写像は `article` があるときだけキーを作る（`undefined` を値に持つキーを作らない。
作ると JSON 化で消えて生成物が写像結果と食い違う）。

UI 上の意味は「記事が無ければカードの『記事』見出しごと描画しない」。宣言は
`intentional_diffs.may_change`「製作物カードの『記事』見出しの省略（新側のみ）」。

## 意図的差異の適用

`intentional_diffs.may_change` に宣言済みの差異のうち、データ値に現れるものは**写像で適用する**。
レジストリに宣言の無い差異を写像で作らない。

| 対象                                     | 論理データ（現行の実値）       | 新側                           | 宣言                                            |
| ---------------------------------------- | ------------------------------ | ------------------------------ | ----------------------------------------------- |
| `badges.account[github].label`           | `Github`                       | `GitHub`                       | `may_change`「GitHub の綴りの是正（新側のみ）」 |
| `badges.account[github].imageSrc`        | `…logo=Github&logoColor=white` | `…logo=GitHub&logoColor=white` | 同上                                            |
| `badges.framework[github-actions].label` | `GithubActions`                | `GitHub Actions`               | 同上                                            |

## 現新一致検証で正規化する項目

以下を正規化したうえで論理的な同一性を検証する。ここに挙げた以外の不一致は**失敗**として扱う。

| 項目             | 正規化                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------ |
| 技術スタック参照 | 新側の安定 ID を論理データの表示名へ逆写像してから比較する                                 |
| 資格の分類       | 新側の配列を `{ name: items }` のオブジェクトへ戻し、順序も含めて比較する                  |
| 希望条件         | 新側の `desiredWork.{title,url}` を `desiredWorkTitle` / `desiredWorkUrl` へ戻して比較する |
| GitHub 綴り      | 上表の対応で新側 → 論理データへ逆写像してから比較する                                      |
| LAPRAS           | 新側の `publicUrl` を論理データと比較し、gap 記録である `preview` は比較対象から除く       |

## エンコーディング・書式

現行・論理データ・新側のいずれも UTF-8（BOM なし）、改行は LF、JSON はキー順・インデント 2・
末尾改行を生成ツールが固定する。日付表記に依存するデータは無い（`base_time` なし）。

生成物（`src/data/generated/`）は整形（oxfmt）の対象外にする。整形すると生成ツールの出力と食い違い、再生成のたびに差分が出るため。
