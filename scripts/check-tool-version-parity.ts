#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";

import { checkToolVersionParity } from "./tool-version-parity";

const root = new URL("../", import.meta.url);

const [miseToml, packageJson] = await Promise.all([
  readFile(new URL("mise.toml", root), "utf8"),
  readFile(new URL("package.json", root), "utf8"),
]);

const problems = checkToolVersionParity({ miseToml, packageJson });

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error("");
  console.error(
    "mise.toml の版と package.json の対応する箇所は同じコミットで同じ版へ揃えてください" +
      "（手順は docs/dependency-policy.md）。",
  );
  process.exitCode = 1;
} else {
  console.log(
    "Tool version parity OK: pnpm（mise / packageManager / devEngines）と " +
      "viteplus（mise / vite エイリアス）が一致。",
  );
}
