/**
 * mise 管理ツールと `package.json` の版の一致検査（純ロジック）。
 *
 * なぜ必要か:
 *   次の 2 組は、同じ版を複数のファイルへ手で書いている。どちらも 1 か所の更新漏れを
 *   既存の検査では早く・直接には落とせない。
 *
 *   1. pnpm: `mise.toml` の `pnpm`、`package.json` の `packageManager`、
 *      `devEngines.packageManager.version`。`devEngines` は `onFail: "warn"` のため、
 *      ずれても警告が出るだけでコマンドは成功し、CI は green のまま通る
 *      （実測 2026-11-26 / Issue #219: mise を 12.22.0、package.json を 12.18.0 にした状態で
 *      `pnpm --version` は `[WARN] This project is configured to use 12.18.0 of pnpm` を出して成功した）。
 *   2. viteplus: `mise.toml` の `viteplus` と、`package.json` の `vite`
 *      （`npm:@voidzero-dev/vite-plus-core@<版>` のエイリアス）。ずれると `vp build` が起動前に
 *      厳密一致エラーで落ちるが（docs/dependency-policy.md「vite は Vite+ core のエイリアスで
 *      管理する」）、CI では最後のほうの Build まで進んでから分かり、原因も読み取りにくい。
 *
 * どちらも等値で比べる（範囲や片側制約にしない）。どちらの組も「同じ版であること」自体が規約で、
 * 新旧どちら向きのずれも許容する理由がない。
 *
 * 参照するのは宣言（`mise.toml` / `package.json`）であり、`pnpm-lock.yaml` の
 * `packageManagerDependencies` や解決済みのエイリアス先は見ない。lockfile は
 * `pnpm install --frozen-lockfile`（CI）が package.json との食い違いを検出する。
 */

import { extractMiseToolPin } from "./mise-toml";

/** 検査対象のファイル内容。呼び出し側（CLI / テスト）が読み込んで渡す。 */
export type ToolVersionSources = {
  /** `mise.toml` の内容。 */
  readonly miseToml: string;
  /** `package.json` の内容。 */
  readonly packageJson: string;
};

/** `vite` エイリアスの接頭辞。版はこの後ろに続く。 */
const VITE_ALIAS_PREFIX = "npm:@voidzero-dev/vite-plus-core@";

/** `packageManager` の接頭辞。版はこの後ろに続く。 */
const PACKAGE_MANAGER_PREFIX = "pnpm@";

type PackageFields = {
  readonly packageManager: string | undefined;
  readonly devEnginesName: string | undefined;
  readonly devEnginesVersion: string | undefined;
  readonly vite: string | undefined;
};

/** `value` がオブジェクト（配列・null 以外）なら、そのキー `key` の値を返す。 */
function property(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  // 型アサーションを使わず、自身のプロパティだけを unknown として取り出す
  // （oxlint の typescript/no-unsafe-type-assertion に合わせる。any は unknown へ受けて広げない）。
  const found: unknown = Object.getOwnPropertyDescriptor(value, key)?.value;
  return found;
}

function stringProperty(value: unknown, ...path: readonly string[]): string | undefined {
  let current = value;
  for (const key of path) current = property(current, key);
  return typeof current === "string" ? current : undefined;
}

/**
 * `package.json` から検査に使う値を取り出す。JSON 自体が読めない、またはオブジェクトでない
 * 場合は undefined を返して呼び出し側に区別させる。
 */
function readPackageFields(packageJson: string): PackageFields | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJson);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;

  return {
    packageManager: stringProperty(parsed, "packageManager"),
    devEnginesName: stringProperty(parsed, "devEngines", "packageManager", "name"),
    devEnginesVersion: stringProperty(parsed, "devEngines", "packageManager", "version"),
    vite: stringProperty(parsed, "devDependencies", "vite"),
  };
}

/** pnpm の 3 か所の一致を検査する。 */
function checkPnpm(miseToml: string, fields: PackageFields): readonly string[] {
  const misePin = extractMiseToolPin(miseToml, "pnpm");
  if (misePin === undefined) {
    return ["mise.toml: [tools] テーブルに pnpm のバージョン指定が見つかりません。"];
  }

  const problems: string[] = [];

  const { packageManager } = fields;
  if (packageManager?.startsWith(PACKAGE_MANAGER_PREFIX) !== true) {
    problems.push(
      `package.json: packageManager は "${PACKAGE_MANAGER_PREFIX}<版>" 形式にしてください` +
        `（実際: ${packageManager === undefined ? "未定義" : `"${packageManager}"`}）。`,
    );
  } else if (
    // corepack 形式の整合性ハッシュ（`pnpm@<版>+sha512.<hex>`）は版の一部ではないので除いて比べる。
    packageManager.slice(PACKAGE_MANAGER_PREFIX.length).split("+")[0] !== misePin
  ) {
    problems.push(
      `pnpm の版が一致していません: mise.toml の pnpm = "${misePin}"、` +
        `package.json の packageManager = "${packageManager}"。`,
    );
  }

  if (fields.devEnginesName !== "pnpm") {
    problems.push('package.json: devEngines.packageManager.name は "pnpm" にしてください。');
  } else if (fields.devEnginesVersion !== misePin) {
    problems.push(
      `pnpm の版が一致していません: mise.toml の pnpm = "${misePin}"、` +
        "package.json の devEngines.packageManager.version = " +
        `${fields.devEnginesVersion === undefined ? "未定義" : `"${fields.devEnginesVersion}"`}。`,
    );
  }

  return problems;
}

/** viteplus と `vite` エイリアスの一致を検査する。 */
function checkViteplus(miseToml: string, fields: PackageFields): readonly string[] {
  const misePin = extractMiseToolPin(miseToml, "viteplus");
  if (misePin === undefined) {
    return ["mise.toml: [tools] テーブルに viteplus のバージョン指定が見つかりません。"];
  }

  const { vite } = fields;
  if (vite?.startsWith(VITE_ALIAS_PREFIX) !== true) {
    return [
      `package.json: devDependencies.vite は "${VITE_ALIAS_PREFIX}<版>" 形式にしてください` +
        `（実際: ${vite === undefined ? "未定義" : `"${vite}"`}）。`,
    ];
  }

  const aliasVersion = vite.slice(VITE_ALIAS_PREFIX.length);
  if (aliasVersion === misePin) return [];
  return [
    `viteplus の版が一致していません: mise.toml の viteplus = "${misePin}"、` +
      `package.json の vite = "${vite}"。`,
  ];
}

/**
 * 整合検査を実行し、問題を人が読めるメッセージの配列で返す。
 * 空配列なら整合している。
 */
export function checkToolVersionParity(sources: ToolVersionSources): readonly string[] {
  const fields = readPackageFields(sources.packageJson);
  if (fields === undefined) {
    return ["package.json: JSON オブジェクトとして解析できません（構文を確認してください）。"];
  }
  return [...checkPnpm(sources.miseToml, fields), ...checkViteplus(sources.miseToml, fields)];
}
