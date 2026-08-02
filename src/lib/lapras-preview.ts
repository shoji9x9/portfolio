export type LaprasPreview = {
  title: string;
  image: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseLaprasPreview(value: unknown, publicUrl: string): LaprasPreview | null {
  if (!isRecord(value)) return null;
  const { title, image, url } = value;
  if (
    typeof title !== "string" ||
    title.trim() === "" ||
    typeof image !== "string" ||
    typeof url !== "string" ||
    url !== publicUrl
  ) {
    return null;
  }
  try {
    const imageUrl = new URL(image);
    if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "media.lapras.com") return null;
  } catch {
    return null;
  }
  return { title, image, url };
}

/** 固定 API から取得し、publicUrl と一致するプロフィール応答だけを返す。 */
export async function fetchLaprasPreview(
  publicUrl: string,
  signal: AbortSignal,
): Promise<LaprasPreview | null> {
  try {
    const response = await fetch("/api/lapras-preview", { signal });
    if (!response.ok) return null;
    return parseLaprasPreview(await response.json(), publicUrl);
  } catch {
    return null;
  }
}
