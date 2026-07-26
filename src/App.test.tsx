import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { navigateToRepository, repositoryUrl } from "@/lib/repository";
import { routeTree } from "@/router";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("アプリシェル内に移行準備画面を描画する", async () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });

    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain("portfolio");
    expect(html).toContain("移行の準備中です");
  });

  it("GitHub リポジトリへ移動する", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign });

    navigateToRepository();

    expect(assign).toHaveBeenCalledWith(repositoryUrl);
  });
});
