import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";

import App from "@/App";

// 現行 `/` は <main> だけの単一ページで、ヘッダー・ナビゲーション・フッターを持たない。
// 共通レイアウトを挟まないのは現行の構成に合わせた意図的な判断（Issue #22 で決定）。
const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

export const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
