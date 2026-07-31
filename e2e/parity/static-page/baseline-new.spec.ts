import type { NetworkEntry } from "../lib/capture";

// 新側ベースラインの採取（parity-diff の入力）。
//
// **撮るのは新側だけ。** 現行のベースラインは parity-suite が採ったものを使い、現行アプリは駆動しない。
// 1 回目は baseline-new/、自己ノイズ用の 2 回目は noise-pass2/ へ同じスペックで書き出す。
//
// 実行:
//   PARITY_NEW_UI_URL=<url> PARITY_NEW_TARGET=<target> PARITY_SLUG=static-page \
//     PARITY_CAPTURE_PASS=baseline pnpm exec playwright test --project=new-capture
import { readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";

import {
  collectDefaultArtifacts,
  collectStateArtifacts,
  INTERACTIVE_SAMPLES,
  writeDefaultArtifacts,
  writeNetworkEntries,
  writeStateArtifacts,
} from "../lib/capture";
import { expect, test } from "../lib/fixtures";
import { captureMaskEntries } from "../lib/locator-map/portable";

type CaptureState = "default" | "hover" | "focus";

type CaptureMetadata = {
  slug: string;
  capture_conditions: {
    viewports: { width: number; height: number; label: string }[];
    full_page: boolean;
    pages: { name: string; path: string }[];
    masks: { name: string; reason: string }[];
    states: CaptureState[];
    state_samples: string[];
  };
  traits: {
    elements: string[];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isCaptureState(value: unknown): value is CaptureState {
  return value === "default" || value === "hover" || value === "focus";
}

function isViewportArray(
  value: unknown,
): value is { width: number; height: number; label: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof Reflect.get(entry, "width") === "number" &&
        typeof Reflect.get(entry, "height") === "number" &&
        typeof Reflect.get(entry, "label") === "string",
    )
  );
}

function isPageArray(value: unknown): value is { name: string; path: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof Reflect.get(entry, "name") === "string" &&
        typeof Reflect.get(entry, "path") === "string",
    )
  );
}

function isMaskArray(value: unknown): value is { name: string; reason: string }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        isRecord(entry) &&
        typeof Reflect.get(entry, "name") === "string" &&
        typeof Reflect.get(entry, "reason") === "string",
    )
  );
}

function parseMetadata(source: string, path: string): CaptureMetadata {
  const parsed: unknown = JSON.parse(source);
  if (!isRecord(parsed)) throw new Error(`採取メタデータがオブジェクトではありません: ${path}`);

  const slugValue = Reflect.get(parsed, "slug");
  const conditions = Reflect.get(parsed, "capture_conditions");
  const traits = Reflect.get(parsed, "traits");
  if (typeof slugValue !== "string" || !isRecord(conditions) || !isRecord(traits)) {
    throw new Error(`採取メタデータの必須項目が不正です: ${path}`);
  }

  const viewportValues = Reflect.get(conditions, "viewports");
  const pageValues = Reflect.get(conditions, "pages");
  const maskValues = Reflect.get(conditions, "masks");
  const stateValues = Reflect.get(conditions, "states");
  const sampleValues = Reflect.get(conditions, "state_samples");
  const fullPageValue = Reflect.get(conditions, "full_page");
  const elementValues = Reflect.get(traits, "elements");
  if (
    !isViewportArray(viewportValues) ||
    !isPageArray(pageValues) ||
    !isMaskArray(maskValues) ||
    !Array.isArray(stateValues) ||
    !stateValues.every(isCaptureState) ||
    !isStringArray(sampleValues) ||
    typeof fullPageValue !== "boolean" ||
    !isStringArray(elementValues)
  ) {
    throw new Error(`採取メタデータの capture_conditions / traits が不正です: ${path}`);
  }

  return {
    slug: slugValue,
    capture_conditions: {
      viewports: viewportValues,
      full_page: fullPageValue,
      pages: pageValues,
      masks: maskValues,
      states: stateValues,
      state_samples: sampleValues,
    },
    traits: { elements: elementValues },
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} が未設定です。`);
  }
  return value;
}

const slug = requireEnv("PARITY_SLUG");
const target = requireEnv("PARITY_NEW_TARGET");
if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(target)) {
  throw new Error(`PARITY_NEW_TARGET にパスとして安全でない値が含まれています: "${target}"`);
}
const pass = process.env["PARITY_CAPTURE_PASS"] ?? "baseline";
if (pass !== "baseline" && pass !== "noise") {
  throw new Error(
    `PARITY_CAPTURE_PASS は "baseline" または "noise" を指定してください（指定値: "${pass}"）。`,
  );
}

const repoRoot = process.env["PARITY_REPO_ROOT"] ?? process.cwd();
const metadataPath = join(repoRoot, ".replace", "parity", slug, "metadata.json");
const metadata = parseMetadata(readFileSync(metadataPath, "utf8"), metadataPath);
if (metadata.slug !== slug || slug !== "static-page") {
  throw new Error(
    `採取スペックと metadata.json の slug が一致しません: spec=static-page, env=${slug}, metadata=${metadata.slug}`,
  );
}

const { viewports, states, pages, masks, full_page: fullPage } = metadata.capture_conditions;
if (
  pages.length !== 1 ||
  pages[0]?.name !== "/" ||
  pages[0].path !== "/" ||
  states.some((state) => !["default", "hover", "focus"].includes(state))
) {
  throw new Error(
    "static-page の対称レイアウトが対応する pages / states と metadata.json が一致しません。",
  );
}
expect(metadata.capture_conditions.state_samples).toEqual(INTERACTIVE_SAMPLES);

const outRoot = join(
  repoRoot,
  ".replace",
  "parity",
  slug,
  "new",
  target,
  pass === "noise" ? "noise-pass2" : "baseline-new",
);
const onlyPairs = (process.env["PARITY_NOISE_PAIRS"] ?? "").split(",").filter(Boolean);
if (pass === "baseline" && onlyPairs.length > 0) {
  throw new Error("PARITY_NOISE_PAIRS は noise パスでのみ指定できます。");
}

function assertInsideOutRoot(path: string): void {
  const rel = relative(outRoot, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`採取先が outRoot の外を指しています: ${path}`);
  }
}

const allPairs = new Set(
  viewports.flatMap((viewport) =>
    pages.flatMap((page) => states.map((state) => `${page.name}|${state}|${viewport.label}`)),
  ),
);
const unknownPairs = onlyPairs.filter((pair) => !allPairs.has(pair));
if (unknownPairs.length > 0) {
  throw new Error(
    `PARITY_NOISE_PAIRS に採取対象と一致しない組があります: ${unknownPairs.join(", ")}`,
  );
}

test.beforeEach(async ({ page }, testInfo) => {
  if (page.isClosed()) {
    throw new Error("採取開始前にブラウザーページが閉じています。");
  }
  if (testInfo.project.name !== "new-capture") {
    throw new Error(
      `新側採取スペックが project="${testInfo.project.name}" で実行されました。new-capture を指定してください。`,
    );
  }
});

test.describe("static-page: 新側ベースライン採取", () => {
  test(`${pass} パスを metadata.json の条件で採取する`, async ({ page, entries, containers }) => {
    test.setTimeout(600_000);

    expect(entries.map(({ name }) => name)).toEqual(metadata.traits.elements);
    const maskCatalog = captureMaskEntries(containers);
    const maskLocators = masks.map(({ name }) => {
      const entry = maskCatalog.find((candidate) => candidate.name === name);
      if (entry === undefined) {
        throw new Error(`マスク論理名 "${name}" がロケータマッピングで解決できません。`);
      }
      return entry.locator;
    });

    const written: string[] = [];
    const [pageDefinition] = pages;
    if (pageDefinition === undefined) {
      throw new Error("capture_conditions.pages が空です。");
    }

    for (const viewport of viewports) {
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

      for (const state of states) {
        const pair = `${pageDefinition.name}|${state}|${viewport.label}`;
        const stateOutput = join(outRoot, viewport.label, state);
        assertInsideOutRoot(stateOutput);
        const reused = pass === "noise" && onlyPairs.length > 0 && !onlyPairs.includes(pair);
        if (reused) {
          await rm(stateOutput, { recursive: true, force: true });
          continue;
        }

        if (pass === "baseline" && state === "default") page.on("response", onResponse);
        await page.goto(pageDefinition.path, { waitUntil: "networkidle" });
        if (pass === "baseline" && state === "default") page.off("response", onResponse);
        if (state === "default") {
          const artifacts = await collectDefaultArtifacts(
            page,
            entries,
            { viewport },
            { fullPage, masks: maskLocators },
          );
          written.push(...(await writeDefaultArtifacts(artifacts, outRoot)));
        } else {
          const artifacts = await collectStateArtifacts(page, entries, state);
          written.push(...(await writeStateArtifacts(artifacts, outRoot, viewport.label, state)));
        }
      }

      if (pass === "baseline") {
        written.push(...(await writeNetworkEntries(network, outRoot, viewport.label)));
      }
    }

    await mkdir(outRoot, { recursive: true });
    await writeFile(`${outRoot}/files.txt`, `${written.toSorted().join("\n")}\n`, "utf8");
  });
});
