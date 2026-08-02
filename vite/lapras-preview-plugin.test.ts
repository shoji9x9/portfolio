import { describe, expect, it, vi } from "vitest";

import {
  createLaprasPreviewDevHandler,
  createLaprasPreviewMiddleware,
  laprasPreviewDevPlugin,
} from "./lapras-preview-plugin";

const previewHtml = `<meta property="og:url" content="https://lapras.com/public/shoji9x9">
<meta property="og:title" content="shoji9x9さんのLAPRAS Profile">
<meta property="og:image" content="https://media.lapras.com/profile.png">`;

describe("Vite LAPRASプレビューアダプター", () => {
  it("対象外のパスはViteへ渡す", async () => {
    const handle = createLaprasPreviewDevHandler({
      fetch: vi.fn(),
      warn: vi.fn(),
    });

    await expect(handle(new Request("http://localhost:5173/"))).resolves.toBeNull();
  });

  it("GET以外は405にする", async () => {
    const handle = createLaprasPreviewDevHandler({
      fetch: vi.fn(),
      warn: vi.fn(),
    });

    const response = await handle(
      new Request("http://localhost:5173/api/lapras-preview", { method: "POST" }),
    );

    expect(response?.status).toBe(405);
    expect(response?.headers.get("Allow")).toBe("GET");
  });

  it("Pages Functionの中核を呼び、成功応答をローカルキャッシュする", async () => {
    const fetchImplementation = vi.fn().mockImplementation(
      async () =>
        new Response(previewHtml, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    );
    const handle = createLaprasPreviewDevHandler({
      fetch: fetchImplementation,
      warn: vi.fn(),
    });
    const request = new Request("http://localhost:5173/api/lapras-preview");

    const first = await handle(request);
    const second = await handle(request);

    expect(first?.status).toBe(200);
    await expect(first?.json()).resolves.toEqual({
      title: "shoji9x9さんのLAPRAS Profile",
      image: "https://media.lapras.com/profile.png",
      url: "https://lapras.com/public/shoji9x9",
    });
    expect(second?.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("開発用キャッシュを24時間で失効させる", async () => {
    let now = 0;
    const fetchImplementation = vi.fn().mockImplementation(
      async () =>
        new Response(previewHtml, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
    );
    const handle = createLaprasPreviewDevHandler({
      fetch: fetchImplementation,
      now: () => now,
      warn: vi.fn(),
    });
    const request = new Request("http://localhost:5173/api/lapras-preview");

    expect((await handle(request))?.status).toBe(200);
    now = 86_400_000;
    expect((await handle(request))?.status).toBe(200);

    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("対象外のリクエストはViteミドルウェアへ渡す", async () => {
    const next = vi.fn();
    const middleware = createLaprasPreviewMiddleware(vi.fn().mockResolvedValue(null));

    middleware({ headers: {} }, { statusCode: 0, end: vi.fn(), setHeader: vi.fn() }, next);

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });

  it("API応答をNodeのレスポンスへ転送する", async () => {
    const end = vi.fn();
    const setHeader = vi.fn();
    const outgoing = { statusCode: 0, end, setHeader };
    const middleware = createLaprasPreviewMiddleware(
      vi
        .fn()
        .mockResolvedValue(
          new Response('{"ok":true}', { status: 201, headers: { "X-Test": "yes" } }),
        ),
    );

    middleware(
      { headers: { host: "localhost:5173" }, method: "GET", url: "/api/lapras-preview" },
      outgoing,
      vi.fn(),
    );

    await vi.waitFor(() => expect(end).toHaveBeenCalledOnce());
    expect(outgoing.statusCode).toBe(201);
    expect(setHeader).toHaveBeenCalledWith("x-test", "yes");
    expect(end).toHaveBeenCalledWith(Buffer.from('{"ok":true}'));
  });

  it("例外をViteのエラー経路へ渡す", async () => {
    const error = new Error("failed");
    const next = vi.fn();
    const middleware = createLaprasPreviewMiddleware(vi.fn().mockRejectedValue(error));

    middleware(
      { headers: {}, method: "GET", url: "/api/lapras-preview" },
      { statusCode: 0, end: vi.fn(), setHeader: vi.fn() },
      next,
    );

    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(error));
  });

  it("Viteプラグインを開発サーバー用として登録する", () => {
    expect(laprasPreviewDevPlugin().name).toBe("portfolio-lapras-preview-dev");
  });
});
