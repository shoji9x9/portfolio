// Commitlint — Conventional Commits 検証（lefthook の commit-msg から実行）。
// package.json は "type": "module" のため本ファイルは ESM として解釈される。
import { RuleConfigSeverity } from "@commitlint/types";

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // AGENTS.md の種別例に合わせる（config-conventional の既定 type を明示）。
    // severity は数値リテラルではなく enum で書く。type-aware lint の no-unsafe-enum-assignment が
    // 数値リテラルを検出する（実測 2026-11-16・プロジェクト全体の lint: viteplus 1.4.0 同梱の
    // oxlint 1.89.0 では検出されず、viteplus 1.5.0 同梱の oxlint 1.91.0 で検出。1.90.x は未測定）。
    "type-enum": [
      RuleConfigSeverity.Error,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "chore",
        "refactor",
        "test",
        "ci",
        "build",
        "perf",
        "revert",
        "style",
      ],
    ],
  },
};
