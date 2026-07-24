// パッケージマネージャを pnpm に強制するローカル実装（preinstall で実行）。
// `npx only-allow pnpm` は毎回外部からパッケージを取得して実行するため、
// ネットワーク制限環境で失敗しやすく lockfile / minimumReleaseAge の管理外になる。
// ここでは外部依存を取得せず、package manager が設定する npm_config_user_agent
// （例: "pnpm/11.17.0 npm/? node/v24.18.0 ..."）だけで判定する。
const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("pnpm/")) {
  console.error("");
  console.error("このリポジトリは pnpm でインストールしてください（`pnpm install`）。");
  console.error("packageManager / devEngines（package.json）も参照。");
  console.error("");
  process.exit(1);
}
