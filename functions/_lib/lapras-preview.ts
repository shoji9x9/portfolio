const PUBLIC_PROFILE_URL = "https://lapras.com/public/shoji9x9";
const UPSTREAM_URL = `https://api.linkpreview.net/?q=${encodeURIComponent(PUBLIC_PROFILE_URL)}`;
const CACHE_TTL_SECONDS = 86_400;

type LaprasPreview = {
  title: string;
  image: string;
  url: string;
};

export type LaprasPreviewEnvironment = {
  LINK_PREVIEW_API_KEY?: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "media.lapras.com";
  } catch {
    return false;
  }
}

function parsePreview(value: unknown): LaprasPreview | null {
  if (!isRecord(value)) return null;
  const { title, image, url } = value;
  if (
    typeof title !== "string" ||
    title.trim() === "" ||
    title.length > 300 ||
    typeof image !== "string" ||
    !validImageUrl(image) ||
    typeof url !== "string" ||
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
 * Pages Function の中核。依存を引数に分け、秘密値や外部通信なしで失敗経路まで検証できるようにする。
 */
export async function handleLaprasPreview(
  request: Request,
  environment: LaprasPreviewEnvironment,
  dependencies: LaprasPreviewDependencies,
): Promise<Response> {
  const key = cacheKey(request);
  try {
    const cached = await dependencies.cache.match(key);
    if (cached !== undefined) return cached;
  } catch {
    dependencies.warn("LAPRAS プレビューのキャッシュ読み込みに失敗しました");
  }

  const apiKey = environment.LINK_PREVIEW_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    return unavailable("API キーの binding が未設定です", dependencies.warn);
  }

  // Workerd（Wrangler pages dev）では AbortSignal.timeout が非互換になり得るため
  // AbortController + setTimeout で明示的にタイムアウトを組む。
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5_000);

  let upstream: Response;
  try {
    upstream = await dependencies.fetch(UPSTREAM_URL, {
      headers: { "X-Linkpreview-Api-Key": apiKey },
      signal: controller.signal,
    });
  } catch {
    return unavailable("上流 API への接続に失敗しました", dependencies.warn);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!upstream.ok) {
    return unavailable(`上流 API が HTTP ${upstream.status} を返しました`, dependencies.warn);
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return unavailable("上流 API の JSON を読み取れませんでした", dependencies.warn);
  }
  const preview = parsePreview(body);
  if (preview === null) {
    return unavailable("上流 API の応答形式が不正です", dependencies.warn);
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
