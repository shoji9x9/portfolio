// Commitlint — Conventional Commits 検証（lefthook の commit-msg から実行）。
// package.json は "type": "module" のため本ファイルは ESM として解釈される。
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // AGENTS.md の種別例に合わせる（config-conventional の既定 type を明示）。
    "type-enum": [
      2,
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
