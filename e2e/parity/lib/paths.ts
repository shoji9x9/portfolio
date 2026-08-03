// パリティ成果物の基準ディレクトリ解決。
//
// 参照する条件（metadata.json）と書き出す成果物が別の根を指すと、「読んだ条件」と
// 「書いた場所」が食い違う。スペックごとに `PARITY_REPO_ROOT ?? process.cwd()` を書くと
// 片方だけ揃え忘れるため、解決はこの 1 箇所に集約する。
import { join } from "node:path";

/** パリティ成果物を置くリポジトリルート。未設定なら実行時の cwd。 */
function parityRepoRoot(): string {
  return process.env["PARITY_REPO_ROOT"] ?? process.cwd();
}

/**
 * パスの一部として安全な slug / target の文字種。
 * `/` や `..` を含む値が join に渡ると `.replace/parity/<slug>/` の外を指せる。
 * slug は `PARITY_SLUG` 由来の値が渡ることがあり、その検証はスペック側では
 * 参照より後に置かれていた（`PARITY_NEW_TARGET` は既に同じ検査を受けている）。
 */
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** パスの一部に使う前に、セグメントとして安全な値かを検査する。 */
export function assertSafeSegment(value: string, label: string): string {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(`${label} にパスとして安全でない値が含まれています: "${value}"`);
  }
  return value;
}

/** 対象 slug の成果物ディレクトリ（`.replace/parity/<slug>/`）。 */
export function parityDir(slug: string): string {
  return join(parityRepoRoot(), ".replace", "parity", assertSafeSegment(slug, "slug"));
}
