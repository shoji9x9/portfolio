import { defineConfig, devices } from "@playwright/test";

const previewUiUrl = process.env["PREVIEW_UI_URL"];

/** Cloudflare Pages へのデプロイ後に、実 Function と外部ページ取得を含めて確認する設定。 */
export default defineConfig({
  testDir: "./e2e/preview",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] === undefined ? 0 : 1,
  workers: 1,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 20_000 },
  use: {
    ...devices["Desktop Chrome"],
    ...(previewUiUrl === undefined ? {} : { baseURL: previewUiUrl }),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
