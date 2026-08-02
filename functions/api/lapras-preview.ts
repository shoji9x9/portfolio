import { handleLaprasPreview } from "../_lib/lapras-preview";

type PagesFunctionContext = {
  request: Request;
  waitUntil: (promise: Promise<unknown>) => void;
};

declare global {
  interface CacheStorage {
    readonly default: Cache;
  }
}

/** `GET /api/lapras-preview` の Cloudflare Pages Function。 */
export function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  return handleLaprasPreview(context.request, {
    cache: caches.default,
    fetch: (input, init) => globalThis.fetch(input, init),
    waitUntil: (promise) => {
      context.waitUntil(promise);
    },
    warn: (message) => {
      console.warn(message);
    },
  });
}
