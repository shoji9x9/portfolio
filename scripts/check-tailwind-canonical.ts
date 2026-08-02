#!/usr/bin/env tsx
import { glob, readFile } from "node:fs/promises";
import { extname } from "node:path";

import { oxlintIgnorePatterns, oxlintSourceGlobs } from "./oxlint-scope";
import { findCanonicalClassViolations, loadTailwindDesignSystem } from "./tailwind-canonical";

const root = new URL("../", import.meta.url);
const stylesheetUrl = new URL("src/index.css", root);
const designSystem = await loadTailwindDesignSystem(stylesheetUrl, new URL("src/", root).pathname);

let violationCount = 0;

// Oxlint と同じファイル集合を検査する。対象と除外は共有定義を正本とし、片方だけに
// ディレクトリーや拡張子が追加されることを防ぐ。
for await (const file of glob(oxlintSourceGlobs, {
  cwd: root,
  exclude: oxlintIgnorePatterns,
})) {
  const source = await readFile(new URL(file, root), "utf8");
  const extension = extname(file).slice(1);

  for (const violation of findCanonicalClassViolations(source, extension, designSystem)) {
    violationCount++;
    console.error(
      `${file}:${violation.line}:${violation.column} ` +
        `Tailwind class \`${violation.candidate}\` can be written as \`${violation.canonical}\``,
    );
  }
}

if (violationCount > 0) {
  console.error(`Found ${violationCount} non-canonical Tailwind class(es).`);
  process.exitCode = 1;
}
