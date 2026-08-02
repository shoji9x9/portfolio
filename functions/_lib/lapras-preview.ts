import lapras from "../../src/data/generated/lapras.json";

const PUBLIC_PROFILE_URL = lapras.publicUrl;
const CACHE_TTL_SECONDS = 86_400;
const MAX_HTML_BYTES = 262_144;

type LaprasPreview = {
  title: string;
  image: string;
  url: string;
};

export type LaprasPreviewDependencies = {
  cache: Pick<Cache, "match" | "put">;
  fetch: typeof fetch;
  waitUntil: (promise: Promise<unknown>) => void;
  warn: (message: string) => void;
};

function jsonResponse(body: unknown, status: number, cacheControl: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function unavailable(reason: string, warn: LaprasPreviewDependencies["warn"]): Response {
  warn(`LAPRAS プレビューを取得できませんでした: ${reason}`);
  return jsonResponse({ error: "lapras_preview_unavailable" }, 503, "no-store");
}

function validImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "media.lapras.com";
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (match, entity: string) => {
    const normalized = entity.toLowerCase();
    const named = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"',
    }[normalized];
    if (named !== undefined) return named;

    const radix = normalized.startsWith("#x") ? 16 : 10;
    const digits = normalized.slice(radix === 16 ? 2 : 1);
    const codePoint = Number.parseInt(digits, radix);
    try {
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    } catch {
      return match;
    }
  });
}

function parseAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4];
    if (name !== undefined && value !== undefined) attributes.set(name, value);
  }
  return attributes;
}

function parsePreviewHtml(html: string): LaprasPreview | null {
  const metadata = new Map<string, string>();
  const requiredProperties = new Set(["og:title", "og:image", "og:url"]);

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const property = attributes.get("property")?.toLowerCase();
    const content = attributes.get("content");
    if (property === undefined || content === undefined || !requiredProperties.has(property)) {
      continue;
    }

    const decoded = decodeHtmlEntities(content);
    const existing = metadata.get(property);
    if (existing !== undefined && existing !== decoded) return null;
    metadata.set(property, decoded);
  }

  const title = metadata.get("og:title")?.trim();
  const image = metadata.get("og:image");
  const url = metadata.get("og:url");
  if (
    title === undefined ||
    title === "" ||
    title.length > 300 ||
    image === undefined ||
    !validImageUrl(image) ||
    url !== PUBLIC_PROFILE_URL
  ) {
    return null;
  }
  return { title, image, url: PUBLIC_PROFILE_URL };
}

function cacheKey(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = "/api/lapras-preview";
  url.search = "";
  return new Request(url, { method: "GET" });
}

/**
 * Pages Function の中核。依存を引数に分け、外部通信なしで失敗経路まで検証できるようにする。
 */
export async function handleLaprasPreview(
  request: Request,
  dependencies: LaprasPreviewDependencies,
): Promise<Response> {
  const key = cacheKey(request);
  try {
    const cached = await dependencies.cache.match(key);
    if (cached !== undefined) return cached;
  } catch {
    dependencies.warn("LAPRAS プレビューのキャッシュ読み込みに失敗しました");
  }

  // Workerd（Wrangler pages dev）では AbortSignal.timeout が非互換になり得るため
  // AbortController + setTimeout で明示的にタイムアウトを組む。
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5_000);

  let upstream: Response;
  try {
    upstream = await dependencies.fetch(PUBLIC_PROFILE_URL, {
      headers: { Accept: "text/html" },
      redirect: "manual",
      signal: controller.signal,
    });
  } catch {
    return unavailable("LAPRAS 公開ページへの接続に失敗しました", dependencies.warn);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!upstream.ok) {
    return unavailable(
      `LAPRAS 公開ページが HTTP ${upstream.status} を返しました`,
      dependencies.warn,
    );
  }
  const contentType = upstream.headers.get("Content-Type");
  if (contentType === null || !/^text\/html(?:;|$)/i.test(contentType)) {
    return unavailable("LAPRAS 公開ページの Content-Type が不正です", dependencies.warn);
  }
  const contentLength = Number(upstream.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    return unavailable("LAPRAS 公開ページの応答が大きすぎます", dependencies.warn);
  }

  let html: string;
  try {
    html = await upstream.text();
  } catch {
    return unavailable("LAPRAS 公開ページを読み取れませんでした", dependencies.warn);
  }
  if (new TextEncoder().encode(html).byteLength > MAX_HTML_BYTES) {
    return unavailable("LAPRAS 公開ページの応答が大きすぎます", dependencies.warn);
  }

  const preview = parsePreviewHtml(html);
  if (preview === null) {
    return unavailable("LAPRAS 公開ページのメタデータが不正です", dependencies.warn);
  }

  const response = jsonResponse(
    preview,
    200,
    `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}`,
  );
  dependencies.waitUntil(
    dependencies.cache.put(key, response.clone()).catch(() => {
      dependencies.warn("LAPRAS プレビューのキャッシュ保存に失敗しました");
    }),
  );
  return response;
}
