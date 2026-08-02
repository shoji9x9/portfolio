import { describe, expect, it } from "vitest";

import { findCanonicalClassViolations, loadTailwindDesignSystem } from "./tailwind-canonical";

const stylesheetUrl = new URL("../src/index.css", import.meta.url);
const designSystem = await loadTailwindDesignSystem(
  stylesheetUrl,
  new URL("../src/", import.meta.url).pathname,
);

// Tailwind は初回の canonicalizeCandidates() で内部表を遅延構築する。CI は品質チェックを
// 並列実行してCPU競合が大きいため、その初期化だけは個々のテストのタイムアウト外で済ませる。
findCanonicalClassViolations('<div className="w-3xl" />', "tsx", designSystem);

describe("findCanonicalClassViolations", () => {
  it("動的数値クラスを canonical な名前へ正規化する", () => {
    // この負例を含むテストファイル自体も canonical 検査の対象になる。違反候補は実行時に
    // 組み立て、テスト入力として検出させつつ、リポジトリー上のソースには違反を残さない。
    const widthCandidate = ["w", "192"].join("-");
    const maxWidthCandidate = ["max-w", "192"].join("-");
    const source = `<div className="${widthCandidate} ${maxWidthCandidate}" />`;

    expect(findCanonicalClassViolations(source, "tsx", designSystem)).toEqual([
      { candidate: widthCandidate, canonical: "w-3xl", column: 17, line: 1 },
      { candidate: maxWidthCandidate, canonical: "max-w-3xl", column: 23, line: 1 },
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
