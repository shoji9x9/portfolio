import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { DECLARED_DIFFS, serializeNewSideDataset, verifyNewSideMatchesLogical } from "./phase-b";

const generatedDirectory = new URL("../src/data/generated/", import.meta.url);

/**
 * 宣言済みの意図的差異を**このテストにも独立して書く**。
 * 写像側（`phase-b.ts`）とパリティスイート側（`e2e/parity/lib/intentional-diffs.ts`）の 2 箇所に
 * 同じ表があり、片方だけ変えると E2E を回すまで気づけない。ここで固定値と突き合わせることで、
 * 写像側の表が動いた瞬間に速いテストで落ちるようにする。
 */
const EXPECTED_DECLARED_DIFFS = [
  {
    path: "badges.account[github].imageSrc",
    logical:
      "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=Github&logoColor=white",
    newSide:
      "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=GitHub&logoColor=white",
  },
  { path: "badges.account[github].label", logical: "Github", newSide: "GitHub" },
  {
    path: "badges.framework[github-actions].label",
    logical: "GithubActions",
    newSide: "GitHub Actions",
  },
];

describe("ゴールデンデータセット フェーズ B（新側への写像）", () => {
  it("新側と論理データの差が、宣言済みの意図的差異と完全に一致する", () => {
    expect(verifyNewSideMatchesLogical()).toEqual({
      checked: ["profile", "badges", "careers", "artifacts", "staticContent", "lapras"],
      declaredDiffs: EXPECTED_DECLARED_DIFFS.length,
    });
  });

  it("宣言済みの意図的差異の一覧が意図した内容から動いていない", () => {
    const sorted = [...DECLARED_DIFFS].toSorted((left, right) => (left.path < right.path ? -1 : 1));
    expect(sorted).toEqual(EXPECTED_DECLARED_DIFFS);
  });

  it("生成物が写像結果と一致する（再生成し忘れの検出）", () => {
    const expected = serializeNewSideDataset();
    const actual = new Map<string, string>();
    for (const name of readdirSync(fileURLToPath(generatedDirectory))) {
      actual.set(name, readFileSync(fileURLToPath(new URL(name, generatedDirectory)), "utf8"));
    }
    expect([...actual.keys()].toSorted()).toEqual([...expected.keys()].toSorted());
    for (const [name, content] of expected) {
      expect(actual.get(name), `${name} が写像結果と異なる`).toBe(content);
    }
  });

  it("生成物が JSON として読み戻せ、末尾が改行で終わる", () => {
    for (const [name, content] of serializeNewSideDataset()) {
      expect(() => {
        JSON.parse(content);
      }, `${name} が JSON として読めない`).not.toThrow();
      expect(content.endsWith("\n"), `${name} が改行で終わっていない`).toBe(true);
    }
  });
});
