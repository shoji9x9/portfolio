---
date: 2026-07-27
type: other
priority: medium
status: applied
session: github-copilot
---

# 実行可能なデータセットのテスト検出を保証する

## 事象

`seed/golden-dataset.test.ts` は存在したが、Vitest の対象が `src/` に限定されていたため、
CI で実行されなかった。データ変更後に期待 fingerprint も古いまま残っていた。

## 根本原因

データセットを CLI として追加した際、テスト配置がアプリケーション用の `src/` 外になった。
Vitest の `include` はアプリケーションのテストだけを対象としていたため、CLI 用テストを検出
できなかった。CLI モジュールの追加時に、テストランナーの対象範囲と期待値を確認する工程が
なかった。

## 提案

`src/` 外に実行可能なモジュールを追加するときは、対応テストが既定のテストランナーで検出され、
データ由来の fingerprint などの期待値が現行出力と同期していることを確認する。

## 適用

`vite.config.ts` の Vitest `include` に `seed/**/*.{test,spec}.{ts,tsx}` を追加し、
ゴールデンデータセットの期待 fingerprint を現行出力へ更新した。
