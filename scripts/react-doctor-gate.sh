#!/usr/bin/env bash
# react-doctor を「スコア 100 未満は失敗」の CI ゲートにするラッパー。
#
# 背景: react-doctor 自体の終了コードは重大度（--blocking）ベースで、
# 「スコアが 100 未満なら失敗」という閾値ゲートには対応しない。そこで
# `react-doctor --score`（数値のみ出力）を取得・パースし、閾値未満なら非 0 終了する。
#
# supply-chain スキャン（Socket.dev, ネットワーク依存で不安定）は CI 安定性のため
# 無効化する（doctor.config.ts でも既定オフ。ここでも明示的に --no-supply-chain）。
set -euo pipefail

# 100 点未満を error とする閾値。緩めたい場合はここを変更する。
THRESHOLD="${REACT_DOCTOR_MIN_SCORE:-100}"

# react-doctor が非 0 終了しても set -e で即死させず、stdout/stderr を両方
# 取得する（失敗時の原因を下の「取得失敗」ハンドラで表示できるように）。
raw_output="$(pnpm exec react-doctor --score --no-supply-chain 2>&1 || true)"

# --score は「数値のみ」を出力する想定だが、pnpm / mise のプリアンブルや
# プロジェクト選択行（例: "✔ Select projects › portfolio"）が混ざり得るため、
# ANSI を除去したうえで「単独行の整数」を末尾から 1 つ取り出す。
# grep のマッチ無し(exit 1)は想定内なので握りつぶし、pipefail で中断させない。
score="$(
  printf '%s\n' "$raw_output" \
    | sed -E 's/\x1b\[[0-9;]*m//g' \
    | { grep -oE '^[[:space:]]*[0-9]+[[:space:]]*$' || true; } \
    | tr -d '[:space:]' \
    | tail -n1
)"

if [ -z "${score:-}" ]; then
  echo "react-doctor-gate: スコアを取得できませんでした。react-doctor の出力:" >&2
  printf '%s\n' "$raw_output" >&2
  exit 2
fi

if [ "$score" -lt "$THRESHOLD" ]; then
  echo "react-doctor-gate: スコア ${score}/100 が閾値 ${THRESHOLD} 未満のため失敗しました。" >&2
  echo "  詳細は 'pnpm exec react-doctor --verbose --no-supply-chain' で確認してください。" >&2
  exit 1
fi

echo "react-doctor-gate: スコア ${score}/100 (>= ${THRESHOLD}) 合格。"
