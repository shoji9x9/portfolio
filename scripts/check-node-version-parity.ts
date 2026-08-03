#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";

import { checkNodeVersionParity } from "./node-version-parity";

const root = new URL("../", import.meta.url);

const [miseToml, packageJson] = await Promise.all([
  readFile(new URL("mise.toml", root), "utf8"),
  readFile(new URL("package.json", root), "utf8"),
]);

const problems = checkNodeVersionParity({ miseToml, packageJson });

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error("");
  console.error(
    "実行環境の Node（mise.toml）と型（@types/node）は同一の変更でまとめて更新してください。",
  );
  process.exitCode = 1;
} else {
  console.log("Node version parity OK: mise.toml / engines.node / @types/node のメジャーが一致。");
}
