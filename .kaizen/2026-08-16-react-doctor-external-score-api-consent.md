---
date: 2026-08-16
type: doc
priority: high
status: pending
applied-to: []
session: codex
---

# 外部品質ゲートの送信内容を実行前に明示する

## 事象

`pnpm react:doctor` が sandbox 内でスコア API に接続できず、外部実行も第三者 API への診断データ送信について明示承認がないため拒否された。送信先と payload を調査してユーザー承認を得るまで、Issue の品質確認と commit が停止した。

## 根本原因

1. React Doctor の合否判定はローカル処理だけではなく、`https://www.react.doctor/api/score` への POST に依存していた。
2. 送信内容には、サニタイズ済み診断結果と、利用可能な場合はリポジトリ・SHA・framework・React バージョン等のメタデータが含まれる。また Sentry テレメトリが有効になり得る。
3. `docs/quality-checks.md`、CI 定義、`scripts/react-doctor-gate.sh` は React Doctor を通常の品質ゲートとして記載しているが、外部送信と同意要否を説明していなかった。

KEDB を「React Doctor / score API」「external / sandbox / approval」「third-party / diagnostics / react-doctor」で照合したが、既存記録はなかった。

## 提案

外部品質ツールを必須ゲートにする場合は、送信先・payload・テレメトリ・オフライン時の失敗を品質チェック文書とラッパーに明記し、エージェントが実行前に同意を得られるようにする。

React Doctor について `docs/quality-checks.md` と `scripts/react-doctor-gate.sh` に外部送信の概要を記載する。実際の反映は Kaizen apply フローで行う。
