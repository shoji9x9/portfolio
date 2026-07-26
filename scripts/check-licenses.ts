#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";

/**
 * 依存ライセンスのコンプライアンス検査（自前実装 / tsx 実行）。
 *
 * 方式は「拒否リスト（default-allow）」:
 *   .github/license-policy.json に列挙した SPDX ライセンス（GPL / AGPL / SSPL 等の強いコピーレフト）を
 *   含むパッケージを検出し、1 つでもあれば非 0 終了する。列挙外は許可する。
 *   拒否リストは Dependency Review と共有する Single Source of Truth。
 *
 * 入力: `pnpm licenses list --json` の出力を stdin で受け取る。
 *   形式: { "<SPDX>": [ { name, versions[], paths[], license, ... }, ... ], ... }
 *
 * SPDX 式の扱い:
 *   - トップレベル `OR`（デュアルライセンス）: 拒否でない選択肢が 1 つでもあれば許容。
 *   - 単一 / `AND` / `WITH`: 拒否 ID を含めば違反。
 *   （再帰下降でカッコ・OR/AND/WITH を評価。原子の判定は正規表現ベース。）
 *
 * フラグ:
 *   --print-deny        拒否リストを出力して終了（exit 0）。
 *   --deny <SPDX-ID>    拒否 ID を追加（陽性テスト用。複数指定可）。
 */

// ---------------------------------------------------------------------------
// 拒否リスト（Single Source of Truth）
//   .github/license-policy.json をローカル検査と Dependency Review の両方で使用する。
//   legacy SPDX 表記（GPL-2.0 / GPL-2.0+ 等）は canonical ID に正規化して判定する。
// ---------------------------------------------------------------------------
type DenyRule = { readonly id: string; readonly re: RegExp };

type LicensePolicy = { readonly denyLicenses: readonly string[] };

const policyUrl = new URL("../.github/license-policy.json", import.meta.url);

function parseLicensePolicy(raw: string): LicensePolicy {
  const parsed: unknown = JSON.parse(raw);
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

const policy = parseLicensePolicy(await readFile(policyUrl, "utf8"));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DENY: DenyRule[] = policy.denyLicenses.map((id) => ({
  id,
  re: new RegExp(`^${escapeRegExp(id)}$`, "i"),
}));

// ---------------------------------------------------------------------------
// SPDX 式の評価
// ---------------------------------------------------------------------------

/** ライセンス識別子（原子）が拒否対象か。 */
function atomDenied(id: string, deny: DenyRule[]): boolean {
  const token = normalizeLegacyLicenseId(id.trim());
  return deny.some((d) => d.re.test(token));
}

function normalizeLegacyLicenseId(id: string): string {
  const match = /^(A?GPL-[1-3]\.0)(\+)?$/i.exec(id);
  if (match === null) return id;

  return `${match[1]}-${match[2] === "+" ? "or-later" : "only"}`;
}

/** トークンが指定の演算子/記号か（大文字小文字無視）。 */
function isOp(t: string | undefined, op: string): boolean {
  return t !== undefined && t.toUpperCase() === op;
}

/** SPDX 式をトークン列に分解する（カッコ・演算子・識別子）。 */
function tokenize(expr: string): string[] {
  return expr
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * SPDX 式を再帰下降で評価し「許可されるか（= 拒否でないか）」を返す。
 *   orExpr  := andExpr (OR andExpr)*      … いずれか許可なら許可
 *   andExpr := withExpr (AND withExpr)*   … すべて許可なら許可
 *   withExpr:= atom (WITH atom)?          … 左辺ライセンスで判定（例外は救済しない）
 *   atom    := '(' orExpr ')' | LICENSEID
 */
function isExpressionAllowed(expr: string, deny: DenyRule[]): boolean {
  const tokens = tokenize(expr);
  let pos = 0;

  const peek = (): string | undefined => tokens[pos];

  function parseAtom(): boolean {
    const t = peek();
    if (t === undefined) return true; // 空 = 許可（default-allow）
    if (t === "(") {
      pos++; // consume '('
      const inner = parseOr();
      if (isOp(peek(), ")")) pos++; // consume ')'
      return inner;
    }
    pos++; // consume license id
    return !atomDenied(t, deny);
  }

  function parseWith(): boolean {
    const left = parseAtom();
    if (isOp(peek(), "WITH")) {
      pos++; // consume WITH
      parseAtom(); // 例外トークンを消費。左辺で判定するため結果は使わない。
    }
    return left;
  }

  function parseAnd(): boolean {
    let acc = parseWith();
    while (isOp(peek(), "AND")) {
      pos++;
      const rhs = parseWith();
      acc = acc && rhs; // AND: すべて許可でなければ不許可
    }
    return acc;
  }

  function parseOr(): boolean {
    let acc = parseAnd();
    while (isOp(peek(), "OR")) {
      pos++;
      const rhs = parseAnd();
      acc = acc || rhs; // OR: いずれか許可なら許可
    }
    return acc;
  }

  return parseOr();
}

// ---------------------------------------------------------------------------
// pnpm licenses list --json のパース
// ---------------------------------------------------------------------------
type LicenseEntry = {
  name?: string;
  version?: string;
  versions?: string[];
  license?: string;
};

type Violation = { pkg: string; versions: string; license: string };

function collectViolations(data: Record<string, LicenseEntry[]>, deny: DenyRule[]): Violation[] {
  const violations: Violation[] = [];
  for (const [groupLicense, entries] of Object.entries(data)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const license = (entry.license ?? groupLicense ?? "").trim();
      if (license === "") continue; // ライセンス不明は default-allow
      if (isExpressionAllowed(license, deny)) continue;
      const versions = entry.versions?.join(", ") ?? entry.version ?? "";
      violations.push({
        pkg: entry.name ?? "(unknown)",
        versions,
        license,
      });
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (buf += chunk));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // --deny <ID> で拒否 ID を追加（陽性テスト用。完全一致でエスケープ）。
  const extraDeny: DenyRule[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--deny") {
      const id = argv[i + 1];
      if (id === undefined) {
        console.error("error: --deny requires a SPDX identifier argument");
        process.exit(2);
      }
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      extraDeny.push({ id: `${id} (--deny)`, re: new RegExp(`^${escaped}$`, "i") });
      i++;
    }
  }
  const deny = [...DENY, ...extraDeny];

  if (argv.includes("--print-deny")) {
    console.log("Denied SPDX licenses (copyleft):");
    for (const d of deny) console.log(`  - ${d.id}`);
    process.exit(0);
  }

  const raw = await readStdin();
  if (raw.trim() === "") {
    console.error("error: no input received on stdin");
    console.error("usage: pnpm licenses list --json | tsx scripts/check-licenses.ts");
    process.exit(2);
  }

  let data: Record<string, LicenseEntry[]>;
  try {
    // JSON.parse は any を返す。外部ツール（pnpm licenses list --json）の出力を
    // 受け取る I/O 境界であり、形状は collectViolations 側で防御的に検証するため、
    // ここでの型付けアサーションのみ明示的に許可する。
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    data = JSON.parse(raw) as Record<string, LicenseEntry[]>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`error: failed to parse JSON input: ${message}`);
    process.exit(2);
  }

  const violations = collectViolations(data, deny);

  if (violations.length === 0) {
    console.log("License check passed: no denied (copyleft) licenses found.");
    process.exit(0);
  }

  console.error(`License check failed: ${violations.length} package(s) use denied licenses:`);
  for (const v of violations) {
    console.error(`  - ${v.pkg}@${v.versions}: ${v.license}`);
  }
  console.error("");
  console.error("Denied licenses are copyleft (GPL / AGPL / SSPL etc.).");
  console.error("Run `tsx scripts/check-licenses.ts --print-deny` to see the deny list.");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
