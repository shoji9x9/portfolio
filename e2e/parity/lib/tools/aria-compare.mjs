// aria 構造比較（差分器の第 3 経路）。
//
// **採取した aria スナップショット（参考資料）どうしを比較する**ためのツール。
// 手書きスナップショット（assertion）とは役割が別で、こちらは「ベースライン相手に構造が変わって
// いないか」を機械的に見る。強度ゲートで構造の DOM 摂動を拾えることを確認し、parity-diff が
// テーブル／フォームの内容パリティの経路として再利用する。
//
// 決定論的: 乱数・現在時刻に依存しない。Playwright に依存しない（純粋な Node）。
// TypeScript 構文は使わない（型は JSDoc）。
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** ツールのバージョン（正本）。比較ロジック・差分形状を変えたら上げる。 */
export const VERSION = "1";

/**
 * 行単位へ正規化する。行末空白と空行を落とし、インデント（＝入れ子の深さ）は保つ。
 * @param {string} snapshot
 * @returns {string[]}
 */
function normalize(snapshot) {
  return snapshot
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim() !== "");
}

/**
 * @typedef {object} AriaDiff
 * @property {number} line - 1 始まりの行番号（baseline 側の位置）
 * @property {'added'|'removed'|'changed'} kind
 * @property {string} [expected]
 * @property {string} [actual]
 */

/**
 * baseline と capture の aria スナップショットを比較して差分行を返す。
 * @param {string} baseline
 * @param {string} capture
 * @returns {AriaDiff[]}
 */
export function compareAria(baseline, capture) {
  const expectedLines = normalize(baseline);
  const actualLines = normalize(capture);
  /** @type {AriaDiff[]} */
  const diffs = [];
  const max = Math.max(expectedLines.length, actualLines.length);
  for (let i = 0; i < max; i += 1) {
    const expected = expectedLines[i];
    const actual = actualLines[i];
    if (expected === actual) continue;
    if (expected === undefined) {
      diffs.push({ line: i + 1, kind: "added", actual });
    } else if (actual === undefined) {
      diffs.push({ line: i + 1, kind: "removed", expected });
    } else {
      diffs.push({ line: i + 1, kind: "changed", expected, actual });
    }
  }
  return diffs;
}

/**
 * CLI エントリ。
 * `node aria-compare.mjs <baseline.txt> <capture.txt>` で差分を JSON 出力し、
 * 差分があれば exit 1、無ければ exit 0、入力エラーは exit 2。
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {number} exit code
 */
export function main(argv) {
  if (argv.length !== 2) {
    process.stderr.write("usage: node aria-compare.mjs <baseline.txt> <capture.txt>\n");
    return 2;
  }
  let baseline;
  let capture;
  try {
    baseline = readFileSync(argv[0], "utf8");
    capture = readFileSync(argv[1], "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: cannot read inputs: ${message}\n`);
    return 2;
  }
  const diffs = compareAria(baseline, capture);
  process.stdout.write(JSON.stringify(diffs, null, 2) + "\n");
  return diffs.length > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exit(main(process.argv.slice(2)));
}
