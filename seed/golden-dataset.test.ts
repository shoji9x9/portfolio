import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  fingerprintOf,
  goldenDataset,
  serializeDataset,
  verifyGoldenDataset,
} from "./golden-dataset";

describe("静的ゴールデンデータセット", () => {
  it("安定 ID、表示順、件数を検証する", () => {
    expect(verifyGoldenDataset()).toEqual({
      fingerprint: "8fd94077",
      counts: {
        profile: 4,
        accountBadges: 5,
        languageBadges: 7,
        frameworkBadges: 14,
        careers: 2,
        projects: 6,
        artifacts: 3,
        selfPromotion: 4,
        qualificationGroups: 4,
      },
    });
    expect(goldenDataset.artifacts.map((artifact) => artifact.id)).toEqual([
      "portfolio",
      "qiita-search",
      "memo-app",
    ]);
  });

  it("生成物の構成と決定論性を検証する", () => {
    const first = serializeDataset();
    const second = serializeDataset();

    expect([...first.keys()].toSorted()).toEqual([
      "artifacts.json",
      "badges.json",
      "careers.json",
      "lapras.json",
      "profile.json",
      "static-content.json",
    ]);
    // 同じ入力から同じ出力になること（ファイルへ書かずに確認する）。
    expect([...second.entries()]).toEqual([...first.entries()]);
    expect(fingerprintOf(second)).toBe(fingerprintOf(first));
    // 生成物はすべて JSON として読み戻せ、末尾は改行で終わる。
    for (const [path, content] of first) {
      expect(content.endsWith("\n"), path).toBe(true);
      expect(() => {
        JSON.parse(content);
      }, path).not.toThrow();
    }
  });

  it("コミット済みの生成物が現在の論理データと一致する", () => {
    // 生成物は Git 管理下にあるため、論理データだけ変えて再生成し忘れると seed/data/ が陳腐化する。
    // 再生成の必要をここで検出する（失敗したら `pnpm exec tsx seed/golden-dataset.ts` を実行する）。
    for (const [path, expected] of serializeDataset()) {
      const url = new URL(`data/${path}`, import.meta.url);
      expect(readFileSync(url, "utf8"), path).toBe(expected);
    }
  });
});
