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

/** 対象 slug の成果物ディレクトリ（`.replace/parity/<slug>/`）。 */
export function parityDir(slug: string): string {
  return join(parityRepoRoot(), ".replace", "parity", slug);
}
