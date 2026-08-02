import { readFile } from "node:fs/promises";

import { __unstable__loadDesignSystem } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";

import { findCanonicalClassViolations } from "./tailwind-canonical";

const stylesheetUrl = new URL("../src/index.css", import.meta.url);
const designSystem = await __unstable__loadDesignSystem(await readFile(stylesheetUrl, "utf8"), {
  base: new URL("../src/", import.meta.url).pathname,
});

describe("findCanonicalClassViolations", () => {
  it("動的数値クラスを canonical な名前へ正規化する", () => {
    const source = '<div className="w-192 max-w-192" />';

    expect(findCanonicalClassViolations(source, "tsx", designSystem)).toEqual([
      { candidate: "w-192", canonical: "w-3xl", column: 17, line: 1 },
      { candidate: "max-w-192", canonical: "max-w-3xl", column: 23, line: 1 },
    ]);
  }, 15_000);

  it("canonical なクラスは許可する", () => {
    const source = '<div className="w-3xl" />';

    expect(findCanonicalClassViolations(source, "tsx", designSystem)).toEqual([]);
  });

  it("Tailwind クラスではない文字列を無視する", () => {
    const source = 'const message = "portfolio-preview";';

    expect(findCanonicalClassViolations(source, "ts", designSystem)).toEqual([]);
  });
});
