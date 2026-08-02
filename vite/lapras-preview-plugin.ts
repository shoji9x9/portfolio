import type { Plugin } from "vite";

import {
  handleLaprasPreview,
  type LaprasPreviewDependencies,
} from "../functions/_lib/lapras-preview";

const DEV_CACHE_TTL_MS = 86_400_000;

type DevHandlerDependencies = Pick<LaprasPreviewDependencies, "fetch" | "warn"> & {
  now?: (() => number) | undefined;
};
type DevHandler = (request: Request) => Promise<Response | null>;
type MiddlewareRequest = {
  headers: { host?: string | undefined };
  method?: string | undefined;
  url?: string | undefined;
};
type MiddlewareResponse = {
  statusCode: number;
  end(body: Uint8Array): void;
  setHeader(name: string, value: string): void;
};
type MiddlewareNext = (error?: unknown) => void;

function requestKey(request: RequestInfo | URL): string {
  if (typeof request === "string") return request;
  return request instanceof URL ? request.href : request.url;
}

function memoryCache(now: () => number): Pick<Cache, "match" | "put"> {
  const responses = new Map<string, { expiresAt: number; response: Response }>();
  return {
    async match(request): Promise<Response | undefined> {
      const key = requestKey(request);
      const cached = responses.get(key);
      if (cached === undefined) return undefined;
      if (cached.expiresAt <= now()) {
        responses.delete(key);
        return undefined;
      }
      return cached.response.clone();
    },
    async put(request, response): Promise<void> {
      responses.set(requestKey(request), {
        expiresAt: now() + DEV_CACHE_TTL_MS,
        response: response.clone(),
      });
    },
  };
}

/**
 * Vite用のリクエストハンドラー。Pages Functionの中核を再利用し、
 * 開発サーバーでも `GET /api/lapras-preview` を確認できるようにする。
 */
export function createLaprasPreviewDevHandler(
  dependencies: DevHandlerDependencies = {
    fetch: (input, init) => globalThis.fetch(input, init),
    warn: (message) => {
      console.warn(message);
    },
  },
): DevHandler {
  const cache = memoryCache(dependencies.now ?? Date.now);
  return async (request) => {
    if (new URL(request.url).pathname !== "/api/lapras-preview") return null;
    if (request.method !== "GET") {
      return new Response(null, { status: 405, headers: { Allow: "GET" } });
    }

    return handleLaprasPreview(request, {
      cache,
      fetch: dependencies.fetch,
      waitUntil: (promise) => {
        void promise.catch(() => undefined);
      },
      warn: dependencies.warn,
    });
  };
}

export function createLaprasPreviewMiddleware(
  handle: DevHandler = createLaprasPreviewDevHandler(),
): (incoming: MiddlewareRequest, outgoing: MiddlewareResponse, next: MiddlewareNext) => void {
  return (incoming, outgoing, next) => {
    void (async () => {
      const host = incoming.headers.host ?? "localhost";
      const request = new Request(new URL(incoming.url ?? "/", `http://${host}`), {
        method: incoming.method ?? "GET",
      });
      const response = await handle(request);
      if (response === null) {
        next();
        return;
      }

      outgoing.statusCode = response.status;
      response.headers.forEach((value, name) => {
        outgoing.setHeader(name, value);
      });
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    })().catch((error: unknown) => {
      // Connectのエラー経路はnext(error)で後続ミドルウェアへ渡す契約。
      // oxlint-disable-next-line promise/no-callback-in-promise
      next(error);
    });
  };
}

/** Vite開発サーバーへLAPRASプレビューAPIを追加する。production buildには影響しない。 */
export function laprasPreviewDevPlugin(): Plugin {
  return {
    name: "portfolio-lapras-preview-dev",
    configureServer(server) {
      const middleware = createLaprasPreviewMiddleware();
      server.middlewares.use((request, response, next) => {
        middleware(request, response, next);
      });
    },
  };
}
