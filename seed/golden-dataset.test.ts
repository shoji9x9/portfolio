import { describe, expect, it } from "vitest";

import { goldenDataset, verifyGoldenDataset } from "./golden-dataset.js";

describe("静的ゴールデンデータセット", () => {
  it("安定 ID、表示順、件数を検証する", () => {
    expect(verifyGoldenDataset()).toEqual({
      fingerprint: "711a2cc4",
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
});
