import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentYear } from "@/lib/date";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getCurrentYear", () => {
  it("Temporal が利用できる場合は Temporal の年を返す", () => {
    vi.stubGlobal("Temporal", {
      Now: {
        plainDateISO: () => ({ year: 2030 }),
      },
    });

    expect(getCurrentYear()).toBe(2030);
  });

  it("Temporal が利用できない場合は Date の年を返す", () => {
    vi.stubGlobal("Temporal", undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T15:00:00+09:00"));

    expect(getCurrentYear()).toBe(2026);
  });
});
