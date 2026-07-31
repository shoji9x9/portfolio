// Playwright 設定（パリティスイート専用）。
//
// projects は `current`（現行アプリ）・`new`（新側 green 検証）・`new-capture`（新側採取）の 3 つ。
// baseURL は URL を直書きせず、
// 環境変数から解決する（`.config/skills/shoji9x9/skills.yml` の targets から呼び出し側が渡す）。
//   - current: PARITY_CURRENT_UI_URL / PARITY_CURRENT_API_URL
//   - new    : PARITY_NEW_UI_URL     / PARITY_NEW_API_URL
// この配線が正本であり、parity-replace / parity-diff も同じ変数名に流す。
//
// parity-suite は `--project current` のみを実行する（新側の green 化は parity-replace の担当）。
import { defineConfig, devices } from "@playwright/test";

/** 実行対象環境の UI baseURL。未設定でも設定の読み込み自体は成功させ、spec 側で早期に失敗させる。 */
const currentUiUrl = process.env["PARITY_CURRENT_UI_URL"];
const newUiUrl = process.env["PARITY_NEW_UI_URL"];

/** ベースライン採取・比較で共有する撮影条件。metadata.json の capture_conditions と対応する。 */
export const VIEWPORTS = [
  { label: "desktop", width: 1280, height: 900 },
  { label: "mobile", width: 390, height: 844 },
] as const;

export default defineConfig({
  testDir: "./e2e",
  // 現行サイトは読み取り専用の静的サイトなので並列で問題ないが、ベースライン採取は
  // 撮影条件を揃えるため spec 内で直列化する（describe.configure）。
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  // 外部の画像 CDN（Shields.io・AtCoder）を待つため既定より長めに取る。
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    // 故障注入で論理名が解決しなくなったとき、テスト全体のタイムアウトまで待たずに落とす。
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // 現行アプリの既定表示（prefers-color-scheme: light）を基準にする。
    // dark は状態として別途明示的に切り替えて確認する。
    colorScheme: "light",
    // 差分比較のため常にアニメーションを止める（現行にアニメーションは無いが条件を固定する）。
    launchOptions: { args: ["--force-prefers-reduced-motion"] },
  },
  projects: [
    {
      name: "current",
      // 新側専用のスペック。新側ベースラインの採取は parity-diff の工程で、現側では走らせない。
      testIgnore: [/static-page\/baseline-new\.spec\.ts$/],
      use: {
        ...devices["Desktop Chrome"],
        ...(currentUiUrl === undefined ? {} : { baseURL: currentUiUrl }),
        viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      },
    },
    {
      name: "new",
      // 現側専用のスペックは新側で走らせない。ベースライン採取と強度ゲートはどちらも
      // 「現側ベースラインを作る／それを相手に照合する」工程で、新側で走らせると
      // 意味を持たないうえ現側の証跡（baseline/・strength-results.json）を上書きしてしまう。
      // 新側の採取と現新比較は parity-diff が `new/<target>/` に対して行う。
      testIgnore: [
        /static-page\/baseline\.spec\.ts$/,
        /static-page\/baseline-new\.spec\.ts$/,
        /static-page\/strength\.spec\.ts$/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        ...(newUiUrl === undefined ? {} : { baseURL: newUiUrl }),
        viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      },
    },
    {
      // parity-diff が新側ベースラインと自己ノイズを採取する専用 project。
      // 採取スペックを new の green 検証から除外し、環境変数の未設定で収集が落ちないようにする。
      name: "new-capture",
      testMatch: /static-page\/baseline-new\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...(newUiUrl === undefined ? {} : { baseURL: newUiUrl }),
        viewport: { width: VIEWPORTS[0].width, height: VIEWPORTS[0].height },
      },
    },
  ],
});
