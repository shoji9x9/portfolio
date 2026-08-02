import type { Page } from "@playwright/test";

/**
 * 2026-07-31 に現行公開サイトから実測したプレビュー。
 *
 * 外部ページから実行時に取得するOGメタデータはゴールデンデータセットへ収録しない。この値は
 * 新側 UI を同じ表示状態へ置くための測定スナップショットであり、上流ページの契約ではない。
 */
export const OBSERVED_LAPRAS_PREVIEW = {
  title: "shoji9x9さんのLAPRAS Profile",
  image:
    "https://media.lapras.com/media/public_setting/ZABL0NU/7724307d3f3342b783ba0af59bf6f02c.png",
  url: "https://lapras.com/public/shoji9x9",
} as const;

export const LAPRAS_API_PATTERN = "**/api/lapras-preview";

export async function routeLaprasPreview(page: Page): Promise<void> {
  await page.route(LAPRAS_API_PATTERN, async (route) => {
    await route.fulfill({ json: OBSERVED_LAPRAS_PREVIEW, status: 200 });
  });
}
