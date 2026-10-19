---
date: 2026-10-19
type: doc
priority: medium
status: pending
applied-to: []
session: claude-code
---

# 実際の出来事を間接証拠に使うときは、その出来事が走った条件で測る

## 事象

Issue #163 で pnpm 12 採用の根拠に「GitHub の Dependabot に
[dependabot-core#16376](https://github.com/dependabot/dependabot-core/pull/16376) が反映された」を挙げた。
推論は「11.28.4 は strict 既定で `pnpm update ... --lockfile-only --no-save -r` が失敗する → 2026-10-19 に
Dependabot の npm 更新 PR が 6 件（#157〜#162）作られた → strict を外す修正が反映済み」というもの。

だが失敗を測ったのは公開 1 日の knip 6.42.0 で、Dependabot は `cooldown`（`default-days: 7`）により
公開 7 日以上の版しか更新しない。その条件（公開 13 日の 6.40.0）では 11.28.4 も strict 既定のまま成功し、
推論は成り立たなかった。測定表には、すでに lockfile に入っている 6.41.0 への「更新」（何も変えない操作）も
成功例として載せていた。いずれも `/code-review --fix` が検出し、`docs/dependency-policy.md` を直した。

## 根本原因

1. なぜ誤ったか → 失敗を測った条件と、証拠に使った出来事（Dependabot の実ジョブ）の条件が違った
2. なぜ違いに気付かなかったか → 若い版を「失敗が出やすい代表値」として選び、出来事側の入力
   （cooldown が選ぶ版）を測定条件として取り出さなかった
3. なぜ取り出さなかったか → AGENTS.md「調査と実験」は「差分が観測された条件で測る」と書くが、
   自分の測定と実世界の出来事（PR 作成・ジョブ成功）を突き合わせて推論する場面を明示していない ← 根本原因

KEDB: [[2026-07-29-verify-under-observed-conditions]]（applied）の再発。applied ファイルへは追記せず、
本ファイルで記録する。無変化の操作を成功例として載せた点は、同節の「陰性結果には操作の成立確認を付ける」
と同じ構図（陽性に見える結果でも、中間状態が変わっていなければ操作は成立していない）。

横断スコープ: 「CI が green だった」「Dependabot が PR を作った」「デプロイが通った」を根拠に
外部システムの状態を推論する場面全般。いずれも外部側の入力（cooldown・paths フィルター・キャッシュ）を
自分の測定条件と照合する必要がある。

## 提案

実際に起きた出来事（PR が作られた・ジョブが通った）を間接証拠に使うときは、その出来事が実行された条件
（入力・設定・選ばれる版）を列挙し、自分の測定がその条件で行われたかを確かめてから結論する。

反映先: AGENTS.md「調査と実験」へ 1 項目追記する（例: Dependabot は cooldown で公開 7 日以上の版だけを
扱うので、公開直後の版での測定は Dependabot の成否の根拠にならない）。
