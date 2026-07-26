import { readFileSync, writeFileSync } from "node:fs";

const policyPath = new URL("../.github/license-policy.json", import.meta.url);
const outputPath = process.argv[2];

if (outputPath === undefined) {
  throw new Error("usage: node scripts/generate-dependency-review-config.mjs <output-path>");
}

/**
 * @param {string} raw
 * @returns {{ denyLicenses: string[] }}
 */
function parseLicensePolicy(raw) {
  /** @type {unknown} */
  const parsed = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("denyLicenses" in parsed) ||
    !Array.isArray(parsed.denyLicenses) ||
    !parsed.denyLicenses.every((license) => typeof license === "string")
  ) {
    throw new Error(".github/license-policy.json must define denyLicenses as an array of strings");
  }
  return { denyLicenses: parsed.denyLicenses };
}

const policy = parseLicensePolicy(readFileSync(policyPath, "utf8"));

const config = [
  "# Generated from .github/license-policy.json. Do not edit directly.",
  "deny-licenses:",
  ...policy.denyLicenses.map((license) => `  - ${license}`),
  "",
].join("\n");

writeFileSync(outputPath, config);
