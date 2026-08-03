import type { NetworkEntry } from "../lib/capture";

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { VIEWPORTS } from "../../../playwright.config";
import { assertBaselineBrowser } from "../lib/browser-version";
import { writeDefaultArtifacts, writeNetworkEntries } from "../lib/capture";
import { test } from "../lib/fixtures";
import { collectLaprasDefaultArtifacts } from "./capture";

function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") throw new Error(`${name} が未設定です`);
  return value;
}

const slug = requireEnvironment("PARITY_SLUG");
if (slug !== "lapras") throw new Error(`PARITY_SLUG は lapras である必要があります: ${slug}`);
const target = requireEnvironment("PARITY_NEW_TARGET");
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(target)) {
  throw new Error(`PARITY_NEW_TARGET にパスとして安全でない値があります: ${target}`);
}
const pass = process.env["PARITY_CAPTURE_PASS"] ?? "baseline";
if (pass !== "baseline" && pass !== "noise") {
  throw new Error(`PARITY_CAPTURE_PASS が不正です: ${pass}`);
}

const outputDirectory = join(
  ".replace",
  "parity",
  "lapras",
  "new",
  target,
  pass === "baseline" ? "baseline-new" : "noise-pass2",
);

test(`lapras: 新側 ${pass} ベースラインを採取する`, async ({ browser, page, containers }) => {
  test.setTimeout(600_000);

  // 現行側ベースラインと違うブラウザーで新側を採ると、比較結果に実装差でない差分が混ざる。
  await assertBaselineBrowser(browser, slug, "new");

  await rm(outputDirectory, { recursive: true, force: true });

  const written: string[] = [];

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const network: NetworkEntry[] = [];
    const onResponse = (response: import("@playwright/test").Response): void => {
      const request = response.request();
      network.push({
        method: request.method(),
        url: request.url(),
        resourceType: request.resourceType(),
        status: response.status(),
      });
    };
    if (pass === "baseline") page.on("response", onResponse);
    await page.goto("/", { waitUntil: "networkidle" });
    if (pass === "baseline") page.off("response", onResponse);

    const artifacts = await collectLaprasDefaultArtifacts(page, containers, { viewport });
    written.push(...(await writeDefaultArtifacts(artifacts, outputDirectory)));
    if (pass === "baseline") {
      written.push(...(await writeNetworkEntries(network, outputDirectory, viewport.label)));
    }
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(`${outputDirectory}/files.txt`, `${written.toSorted().join("\n")}\n`, "utf8");
});
