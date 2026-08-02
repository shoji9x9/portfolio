import { describe, expect, it, vi } from "vitest";

import { handleLaprasPreview, type LaprasPreviewDependencies } from "./lapras-preview";

const request = new Request("https://portfolio.example/api/lapras-preview?ignored=true");
const validPreview = {
  title: "shoji9x9さんのLAPRAS Profile",
  image: "https://media.lapras.com/media/public_setting/example.png",
  url: "https://lapras.com/public/shoji9x9",
};

function dependencies(
  overrides: Partial<LaprasPreviewDependencies> = {},
): LaprasPreviewDependencies {
  return {
    cache: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    fetch: vi.fn().mockResolvedValue(Response.json(validPreview)),
    waitUntil: vi.fn(),
    warn: vi.fn(),
    ...overrides,
  };
}

describe("LAPRAS プレビュー API", () => {
  it("キャッシュヒット時は上流 API を呼ばず、その応答を返す", async () => {
    const cached = Response.json(validPreview);
    const deps = dependencies({
      cache: {
        match: vi.fn().mockResolvedValue(cached),
        put: vi.fn(),
      },
    });

    const response = await handleLaprasPreview(request, {}, deps);

    expect(response).toBe(cached);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("検証済み応答だけを 24 時間キャッシュし、秘密値はヘッダーで送る", async () => {
    const deps = dependencies();

    const response = await handleLaprasPreview(
      request,
      { LINK_PREVIEW_API_KEY: "test-secret" },
      deps,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(validPreview);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, s-maxage=86400");
    expect(deps.fetch).toHaveBeenCalledWith(
      "https://api.linkpreview.net/?q=https%3A%2F%2Flapras.com%2Fpublic%2Fshoji9x9",
      expect.objectContaining({
        headers: { "X-Linkpreview-Api-Key": "test-secret" },
      }),
    );
    expect(deps.waitUntil).toHaveBeenCalledOnce();
  });

  it("成功時はタイムアウト用タイマーを解除する", async () => {
    vi.useFakeTimers();
    try {
      const response = await handleLaprasPreview(
        request,
        { LINK_PREVIEW_API_KEY: "secret" },
        dependencies(),
      );

      expect(response.status).toBe(200);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("上流 fetch が遅延しても AbortController で中断し 503 を返す", async () => {
    vi.useFakeTimers();
    try {
      const warn = vi.fn();
      const fetchImplementation = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        });
      }) as typeof fetch;
      const pending = handleLaprasPreview(
        request,
        { LINK_PREVIEW_API_KEY: "secret" },
        dependencies({ fetch: fetchImplementation, warn }),
      );

      await vi.advanceTimersByTimeAsync(5_000);
      const response = await pending;

      expect(response.status).toBe(503);
      expect(warn).toHaveBeenCalledWith(
        "LAPRAS プレビューを取得できませんでした: 上流 API への接続に失敗しました",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["secret binding の不足", {}, undefined],
    [
      "上流 API の HTTP エラー",
      { LINK_PREVIEW_API_KEY: "secret" },
      new Response("rate limited", { status: 429 }),
    ],
    [
      "不正な応答形式",
      { LINK_PREVIEW_API_KEY: "secret" },
      Response.json({ ...validPreview, image: "http://example.com/image.png" }),
    ],
  ])("%sでは固定 503 を返し、外部レスポンス本文を漏らさない", async (_, env, upstream) => {
    const warn = vi.fn();
    const deps = dependencies({
      warn,
      ...(upstream === undefined
        ? {}
        : { fetch: vi.fn().mockResolvedValue(upstream) as typeof fetch }),
    });

    const response = await handleLaprasPreview(request, env, deps);

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "lapras_preview_unavailable" });
    expect(warn.mock.calls.flat().join(" ")).not.toContain("rate limited");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("secret");
  });

  it("キャッシュ障害では上流へ継続し、保存障害もレスポンスを失敗させない", async () => {
    const warn = vi.fn();
    const cache = {
      match: vi.fn().mockRejectedValue(new Error("cache read")),
      put: vi.fn().mockRejectedValue(new Error("cache write")),
    };
    let deferred: Promise<unknown> | undefined;
    const deps = dependencies({
      cache,
      warn,
      waitUntil: (promise) => {
        deferred = promise;
      },
    });

    const response = await handleLaprasPreview(request, { LINK_PREVIEW_API_KEY: "secret" }, deps);
    await deferred;

    expect(response.status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("上流への接続失敗と JSON 解析失敗を 503 にする", async () => {
    const failures: LaprasPreviewDependencies["fetch"][] = [
      vi.fn().mockRejectedValue(new Error("network")),
      vi.fn().mockResolvedValue(new Response("{", { status: 200 })),
    ];
    for (const fetchImplementation of failures) {
      const response = await handleLaprasPreview(
        request,
        { LINK_PREVIEW_API_KEY: "secret" },
        dependencies({ fetch: fetchImplementation }),
      );
      expect(response.status).toBe(503);
    }
  });
});
