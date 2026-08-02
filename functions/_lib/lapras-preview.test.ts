import { describe, expect, it, vi } from "vitest";

import { handleLaprasPreview, type LaprasPreviewDependencies } from "./lapras-preview";

const request = new Request("https://portfolio.example/api/lapras-preview?ignored=true");
const validPreview = {
  title: "shoji9x9さんのLAPRAS Profile",
  image: "https://media.lapras.com/media/public_setting/example.png",
  url: "https://lapras.com/public/shoji9x9",
};
const validHtml = `<!doctype html>
<html><head>
  <meta property="og:url" content="${validPreview.url}" />
  <meta property="og:title" content="${validPreview.title}" />
  <meta property="og:image" content="${validPreview.image}" />
</head></html>`;

function htmlResponse(
  body = validHtml,
  options: { status?: number; contentType?: string; contentLength?: string } = {},
): Response {
  const headers = new Headers();
  if (options.contentType !== undefined) headers.set("Content-Type", options.contentType);
  else headers.set("Content-Type", "text/html; charset=utf-8");
  if (options.contentLength !== undefined) headers.set("Content-Length", options.contentLength);
  return new Response(body, { status: options.status ?? 200, headers });
}

function dependencies(
  overrides: Partial<LaprasPreviewDependencies> = {},
): LaprasPreviewDependencies {
  return {
    cache: {
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
    fetch: vi.fn().mockResolvedValue(htmlResponse()),
    waitUntil: vi.fn(),
    warn: vi.fn(),
    ...overrides,
  };
}

describe("LAPRAS プレビュー API", () => {
  it("キャッシュヒット時はLAPRAS公開ページを呼ばず、その応答を返す", async () => {
    const cached = Response.json(validPreview);
    const deps = dependencies({
      cache: {
        match: vi.fn().mockResolvedValue(cached),
        put: vi.fn(),
      },
    });

    const response = await handleLaprasPreview(request, deps);

    expect(response).toBe(cached);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("検証済みOGメタデータだけを24時間キャッシュする", async () => {
    const deps = dependencies();

    const response = await handleLaprasPreview(request, deps);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(validPreview);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400, s-maxage=86400");
    expect(deps.fetch).toHaveBeenCalledWith(
      "https://lapras.com/public/shoji9x9",
      expect.objectContaining({
        headers: { Accept: "text/html" },
        redirect: "manual",
      }),
    );
    expect(deps.waitUntil).toHaveBeenCalledOnce();
  });

  it("属性順序・引用符・HTML文字参照が異なってもOGメタデータを解析する", async () => {
    const html = `<html><head>
      <meta content='https://lapras.com/public/shoji9x9' property='OG:URL'>
      <meta content="shoji9x9 &amp; LAPRAS" property="og:title">
      <meta content='https://media.lapras.com/profile.png' property='og:image'>
    </head></html>`;

    const response = await handleLaprasPreview(
      request,
      dependencies({ fetch: vi.fn().mockResolvedValue(htmlResponse(html)) }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      title: "shoji9x9 & LAPRAS",
      image: "https://media.lapras.com/profile.png",
      url: validPreview.url,
    });
  });

  it("成功時はタイムアウト用タイマーを解除する", async () => {
    vi.useFakeTimers();
    try {
      const response = await handleLaprasPreview(request, dependencies());

      expect(response.status).toBe(200);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("LAPRAS公開ページの取得が遅延してもAbortControllerで中断し503を返す", async () => {
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
        dependencies({ fetch: fetchImplementation, warn }),
      );

      await vi.advanceTimersByTimeAsync(5_000);
      const response = await pending;

      expect(response.status).toBe(503);
      expect(warn).toHaveBeenCalledWith(
        "LAPRAS プレビューを取得できませんでした: LAPRAS 公開ページへの接続に失敗しました",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["HTTPエラー", htmlResponse("rate limited", { status: 429 })],
    [
      "不正な画像URL",
      htmlResponse(validHtml.replace(validPreview.image, "http://example.com/image.png")),
    ],
    [
      "一致しないOG URL",
      htmlResponse(validHtml.replace(validPreview.url, "https://lapras.com/public/another")),
    ],
    ["HTML以外のContent-Type", htmlResponse("{}", { contentType: "application/json" })],
    [
      "矛盾する重複メタデータ",
      htmlResponse(
        validHtml.replace("</head>", '<meta property="og:title" content="別のタイトル" /></head>'),
      ),
    ],
  ])("%sでは固定503を返し、外部レスポンス本文を漏らさない", async (_, upstream) => {
    const warn = vi.fn();
    const response = await handleLaprasPreview(
      request,
      dependencies({ fetch: vi.fn().mockResolvedValue(upstream), warn }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "lapras_preview_unavailable" });
    expect(warn.mock.calls.flat().join(" ")).not.toContain("rate limited");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("別のタイトル");
  });

  it.each([
    ["Content-Length", htmlResponse(validHtml, { contentLength: "262145" })],
    ["実際の本文", htmlResponse("x".repeat(262_145))],
  ])("%sが上限を超える応答を拒否する", async (_, upstream) => {
    const response = await handleLaprasPreview(
      request,
      dependencies({ fetch: vi.fn().mockResolvedValue(upstream) }),
    );

    expect(response.status).toBe(503);
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

    const response = await handleLaprasPreview(request, deps);
    await deferred;

    expect(response.status).toBe(200);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("接続失敗と本文読み取り失敗を503にする", async () => {
    const unreadable = htmlResponse();
    vi.spyOn(unreadable, "text").mockRejectedValue(new Error("read"));
    const failures: LaprasPreviewDependencies["fetch"][] = [
      vi.fn().mockRejectedValue(new Error("network")),
      vi.fn().mockResolvedValue(unreadable),
    ];
    for (const fetchImplementation of failures) {
      const response = await handleLaprasPreview(
        request,
        dependencies({ fetch: fetchImplementation }),
      );
      expect(response.status).toBe(503);
    }
  });
});
