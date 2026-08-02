#!/usr/bin/env tsx
import { glob, readFile } from "node:fs/promises";
import { extname, relative } from "node:path";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";

import { findCanonicalClassViolations } from "./tailwind-canonical";

const root = new URL("../", import.meta.url);
const stylesheetUrl = new URL("src/index.css", root);
const designSystem = await __unstable__loadDesignSystem(await readFile(stylesheetUrl, "utf8"), {
  base: new URL("src/", root).pathname,
});

let violationCount = 0;

for await (const file of glob("src/**/*.{html,js,jsx,ts,tsx}", { cwd: root })) {
  const source = await readFile(new URL(file, root), "utf8");
  const extension = extname(file).slice(1);

  for (const violation of findCanonicalClassViolations(source, extension, designSystem)) {
    violationCount++;
    console.error(
      `${relative(process.cwd(), file)}:${violation.line}:${violation.column} ` +
        `Tailwind class \`${violation.candidate}\` can be written as \`${violation.canonical}\``,
    );
  }
}

if (violationCount > 0) {
  console.error(`Found ${violationCount} non-canonical Tailwind class(es).`);
  process.exitCode = 1;
}
