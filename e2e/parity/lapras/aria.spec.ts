import { VIEWPORTS } from "../../../playwright.config";
import { expect, test } from "../lib/fixtures";

for (const viewport of VIEWPORTS) {
  test.describe(`lapras: 構造パリティ (${viewport.label})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("見出しと画像リンク", async ({ containers }) => {
      await expect(containers.section("lapras")).toMatchAriaSnapshot(`
        - heading "LAPRAS" [level=2]
        - link "shoji9x9さんのLAPRAS Profile":
          - img "shoji9x9さんのLAPRAS Profile"
      `);
    });
  });
}
