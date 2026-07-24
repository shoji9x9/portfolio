import { cn } from "@/lib/utils";

describe("cn", () => {
  it("結合したクラス名を連結する", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("競合する Tailwind ユーティリティを後勝ちで解決する", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("falsy な条件値を無視する", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
