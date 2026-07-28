// Cloudflare Pages の現在ブランチ向けプレビュー URL を標準出力に 1 行で出す。
// skills.yml の replace-strategy.targets[preview].url_command から呼ばれる。
//
// ブランチ名から alias（https://<branch alias>.shoji9x9.pages.dev）を自前で組み立てると Cloudflare 側の
// 正規化規則（英数以外の置換・長さ切り詰め）を二重実装することになるため、wrangler に問い合わせる。
// ただし `wrangler pages deployment list --json` は alias を返さないため、デプロイ固有 URL
// （https://<デプロイ ID 先頭 8 桁>.shoji9x9.pages.dev）を使う。これは特定のデプロイに固定されるため、
// 検証の途中で別デプロイへすり替わらないという点で alias より確実である。
//
// プレビューは PR 作成時にのみデプロイされる（.github/workflows/deploy.yml）。PR 未作成のブランチでは
// 該当デプロイが無く、このスクリプトは失敗する（url_command は失敗・空出力で呼び出し側を停止させる契約）。
// 同じ契約に基づき、デプロイが未完了・失敗のとき、およびデプロイ元コミットが HEAD と異なるとき
// （push 前のコミットがある等）も、古い／壊れた環境を検証させないよう URL を返さず停止する。
import { execFileSync } from "node:child_process";

const projectName = "shoji9x9";

/**
 * @param {string} file
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
function run(file, args, env) {
  return execFileSync(file, args, {
    encoding: "utf8",
    env: env === undefined ? process.env : { ...process.env, ...env },
  }).trim();
}

/**
 * `unknown` からプロパティを 1 段取り出す。想定外の形なら undefined を返し、呼び出し側で停止させる。
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function property(value, key) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined;
}

const branch = run("git", ["branch", "--show-current"]);
if (branch === "") {
  throw new Error("現在のブランチを取得できません（detached HEAD の可能性があります）。");
}

// 認証情報は OS keyring から読む（docs/deployment.md の初回設定）。平文フォールバックは禁止する。
const raw = run(
  "wrangler",
  [
    "pages",
    "deployment",
    "list",
    "--project-name",
    projectName,
    "--environment",
    "preview",
    "--json",
  ],
  { CLOUDFLARE_AUTH_USE_KEYRING: "true" },
);

/** @type {unknown} */
let parsed;
try {
  parsed = JSON.parse(raw);
} catch {
  throw new Error("wrangler の出力を JSON として解釈できません。");
}
if (!Array.isArray(parsed)) {
  throw new Error("wrangler の出力が配列ではありません。--json の出力形式を確認してください。");
}

// 出力には機械可読なデプロイ日時が無く（Status は "7 hours ago" のような相対表記）、
// 新しい順に返るという wrangler の並び順に依存して先頭を最新として扱う。
/** @type {unknown} */
const latest = parsed.find((deployment) => property(deployment, "Branch") === branch);
if (latest === undefined) {
  throw new Error(
    `ブランチ ${branch} のプレビューデプロイが見つかりません。` +
      "プレビューは PR 作成時にデプロイされます（PR 作成前は解決できません）。",
  );
}

// wrangler の Status は、完了したデプロイでは相対時刻（"7 hours ago" / "just now"）、
// それ以外では最終ステージの状態を title case にした 1 語になる。進行中・失敗したデプロイの URL は
// エラーページや未完成のビルドを返すため、その URL で検証を続けさせず停止する。
const incompleteStatuses = new Set([
  "Idle",
  "Active",
  "Canceled",
  "Cancelled",
  "Failure",
  "Skipped",
]);
const status = property(latest, "Status");
if (typeof status !== "string" || status === "") {
  throw new Error("デプロイの状態を取得できません。--json の出力形式を確認してください。");
}
if (incompleteStatuses.has(status)) {
  throw new Error(
    `ブランチ ${branch} の最新プレビューデプロイは完了していません（状態: ${status}）。` +
      "デプロイの完了を待つか、失敗していれば修正して再デプロイしてください。",
  );
}

// デプロイ元コミットが手元の HEAD と違うなら、検証対象は手元のコードではない（push 前のコミットが
// あるか、最新の push のデプロイがまだ終わっていない）。古いビルドを現在のコードとして検証しないよう停止する。
const deployedSha = property(latest, "Source");
const headSha = run("git", ["rev-parse", "HEAD"]);
if (typeof deployedSha !== "string" || deployedSha.length < 7 || !headSha.startsWith(deployedSha)) {
  throw new Error(
    `最新プレビューデプロイのコミット（${String(deployedSha)}）が HEAD（${headSha.slice(0, 7)}）と一致しません。` +
      "push とデプロイの完了を待ってから再実行してください。",
  );
}

const url = property(latest, "Deployment");
if (typeof url !== "string" || url === "") {
  throw new Error("デプロイから URL を取得できません。--json の出力形式を確認してください。");
}

process.stdout.write(`${url}\n`);
