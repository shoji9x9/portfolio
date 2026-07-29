// 画素差分（プロジェクト側で選定したツール）。pixelmatch + pngjs を使う。
//
// parity-suite の強度ゲートで健全性を確認し、parity-diff がそのまま再利用する。
// しきい値・出力形状を変えたら VERSION を上げ、`metadata.json` の differ を更新する。
//
// 決定論的: 乱数・現在時刻に依存しない。Playwright に依存しない（純粋な Node）。
// TypeScript 構文は使わない（型は JSDoc）。
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/** ツールのバージョン（正本）。比較ロジック・差分形状を変えたら上げる。 */
export const VERSION = "1";

/**
 * pixelmatch の色距離しきい値（0〜1）。0.1 は pixelmatch の既定。
 * アンチエイリアスの揺れを拾いすぎない一方、色の入れ替えは確実に拾う値。
 * @type {number}
 */
export const PIXEL_THRESHOLD = 0.1;

/**
 * 2 枚の PNG を比較する。サイズが違う場合は差分画像を作らず、寸法差として報告する
 * （寸法が違う時点でレイアウトの差であり、画素単位の比較は意味を持たないため）。
 * @param {Buffer} baselineBuffer
 * @param {Buffer} captureBuffer
 * @param {{ threshold?: number }} [options]
 * @returns {{ dimensionsMatch: boolean, baseline: {width:number,height:number}, capture: {width:number,height:number}, diffPixels: number, totalPixels: number, ratio: number, diffPng: Buffer | null }}
 */
export function comparePng(baselineBuffer, captureBuffer, options = {}) {
  const threshold = options.threshold ?? PIXEL_THRESHOLD;
  const baseline = PNG.sync.read(baselineBuffer);
  const capture = PNG.sync.read(captureBuffer);
  const dimensionsMatch = baseline.width === capture.width && baseline.height === capture.height;
  const totalPixels = baseline.width * baseline.height;

  if (!dimensionsMatch) {
    return {
      dimensionsMatch,
      baseline: { width: baseline.width, height: baseline.height },
      capture: { width: capture.width, height: capture.height },
      diffPixels: totalPixels,
      totalPixels,
      ratio: 1,
      diffPng: null,
    };
  }

  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPixels = pixelmatch(
    baseline.data,
    capture.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold },
  );
  return {
    dimensionsMatch,
    baseline: { width: baseline.width, height: baseline.height },
    capture: { width: capture.width, height: capture.height },
    diffPixels,
    totalPixels,
    ratio: totalPixels === 0 ? 0 : diffPixels / totalPixels,
    diffPng: diffPixels > 0 ? PNG.sync.write(diff) : null,
  };
}

/**
 * CLI エントリ。
 * `node pixel-compare.mjs <baseline.png> <capture.png> [--threshold <0..1>] [--out <diff.png>]`
 * 差分の要約を JSON 出力し、差分があれば exit 1、無ければ exit 0、入力エラーは exit 2。
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {number} exit code
 */
export function main(argv) {
  const usage =
    "usage: node pixel-compare.mjs <baseline.png> <capture.png> [--threshold <0..1>] [--out <diff.png>]\n";
  const files = [];
  let threshold;
  let out;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--threshold") {
      threshold = Number(argv[i + 1]);
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
        process.stderr.write("error: --threshold must be between 0 and 1\n");
        return 2;
      }
      i += 1;
    } else if (argv[i] === "--out") {
      out = argv[i + 1];
      i += 1;
    } else {
      files.push(argv[i]);
    }
  }
  if (files.length !== 2) {
    process.stderr.write(usage);
    return 2;
  }
  let result;
  try {
    result = comparePng(
      readFileSync(files[0]),
      readFileSync(files[1]),
      threshold === undefined ? {} : { threshold },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error: cannot compare inputs: ${message}\n`);
    return 2;
  }
  if (out !== undefined && result.diffPng !== null) {
    writeFileSync(out, result.diffPng);
  }
  const { diffPng: _diffPng, ...summary } = result;
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  return result.diffPixels > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  process.exit(main(process.argv.slice(2)));
}
