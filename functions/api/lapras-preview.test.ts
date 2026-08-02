import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequestGet } from "./lapras-preview";

const preview = {
  title: "shoji9x9さんのLAPRAS Profile",
  image: "https://media.lapras.com/media/public_setting/example.png",
  url: "https://lapras.com/public/shoji9x9",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Pages Function adapter", () => {
  it("binding・Cache・fetch・waitUntil を中核ハンドラーへ配線する", async () => {
    const cache = {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const fetchImplementation = vi.fn(function (this: typeof globalThis): Promise<Response> {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(Response.json(preview));
    });
    vi.stubGlobal("caches", { default: cache });
    vi.stubGlobal("fetch", fetchImplementation);
    let waitUntilCalled = false;
    const context = {
      request: new Request("https://portfolio.example/api/lapras-preview"),
      env: { LINK_PREVIEW_API_KEY: "test-secret" },
      waitUntil(promise: Promise<unknown>): void {
        if (this !== context) throw new TypeError("Illegal invocation");
        waitUntilCalled = true;
        void promise;
      },
    };

    const response = await onRequestGet(context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(preview);
    expect(fetchImplementation).toHaveBeenCalledOnce();
    expect(cache.put).toHaveBeenCalledOnce();
    expect(waitUntilCalled).toBe(true);
  });
});
