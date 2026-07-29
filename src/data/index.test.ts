import { describe, expect, it, vi } from "vitest";

import { badges, resolveTechStack } from "@/data";

describe("resolveTechStack", () => {
  it("安定 ID の並びをバッジの並びへ解決する", () => {
    const resolved = resolveTechStack(["typescript", "react"]);
    expect(resolved.map((badge) => badge.label)).toEqual(["TypeScript", "React"]);
  });

  it("言語とフレームワークを横断して解決する", () => {
    const ids = [...badges.language, ...badges.framework].map((badge) => badge.id);
    expect(resolveTechStack(ids)).toHaveLength(ids.length);
  });

  it("未知の ID があってもページ全体を落とさず、警告を出して該当分だけ落とす", () => {
    // 例外にするとルートごと空になり、現行（壊れた画像 1 つで済む）より可用性が落ちる。
    // データ不整合は生成物の検証とパリティスイートのバッジ件数判定が捕まえる。
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      expect(resolveTechStack(["typescript", "unknown-badge", "react"])).toHaveLength(2);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("unknown-badge"));
    } finally {
      warn.mockRestore();
    }
  });
});
