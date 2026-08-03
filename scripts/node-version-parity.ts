/**
 * 実行環境の Node（mise）と型（`@types/node`）の整合検査（純ロジック）。
 *
 * なぜ必要か:
 *   Node の実行環境は mise（`mise.toml` の `node`）、型は pnpm（`package.json` の
 *   `@types/node`）が管理しており、管理主体が分かれている。`tsc -b` は「型と実行環境が
 *   一致していること」を検査しないため、型だけメジャーを上げると型検査は通るのに実行時に
 *   存在しない API を使える状態になる。実測: PR #36（`@types/node` 24 → 26 単独）は CI が
 *   green だった。この不整合は「CI が green」では検出できないので、ここで機械的に落とす。
 *
 * なぜ `@types/node` を mise 側へ寄せないか:
 *   mise の npm backend が公開するのは PATH 上の実行ファイルだけで、型定義のみの
 *   パッケージは TypeScript から解決できない。さらに `@types/node` は vite / vitest /
 *   cosmiconfig-typescript-loader の peer dependency、`@types/pngjs` の実依存であり、
 *   node_modules から外すと peer 解決が壊れる。よって「同じ場所で管理する」ではなく
 *   「ずれを機械が検出する」方針を採る。
 *
 * 検査するのは次の 3 点。
 *   1. `mise.toml` の `node` / `engines.node` / `@types/node` の **メジャーが一致**すること。
 *   2. mise が入れる Node が `engines.node` の下限を**満たす**こと。
 *   3. `@types/node` の minor が mise の Node の minor を**超えない**こと（片側の制約）。
 *
 * 3 を等値ではなく片側にする理由（2026-08-03 実測）:
 *   `@types/node` の minor は Node の minor の API 追加を追う。26.0.0 → 26.1.1 の差分には
 *   `crypto.randomUUIDv7` / `diagnostics_channel.boundedChannel` / 新モジュール `node:ffi` が
 *   含まれ、いずれも Node 26.0.0 には存在せず（`node:ffi` は `--experimental-ffi` 自体が無い）
 *   26.5.0 には存在する。型が実行環境より先行すると `tsc` は通り実行時に
 *   `SyntaxError: ... does not provide an export named 'randomUUIDv7'` で落ちる——メジャーの
 *   場合と種類が同じ不整合。逆向き（型が古い）は使える API に型が付かないだけで誤った通過は
 *   起きないため許容する。この非対称性ゆえに等値ではなく片側制約にする。
 *
 * patch は比較しない。`@types/node` の patch は DefinitelyTyped 側の型修正で Node の patch
 * リリースとは対応しない。mise の patch 更新ごとに `package.json` を触らせる意味もない。
 *
 * 参照するのは `package.json` の宣言範囲であり、`pnpm-lock.yaml` の解決済みバージョンではない。
 * Dependabot は範囲ごと書き換えるので更新 PR は捕まえられるが、lockfile だけが更新される経路
 * （`pnpm update` 等）は対象外。
 */

/** 検査対象のファイル内容。呼び出し側（CLI / テスト）が読み込んで渡す。 */
export type NodeVersionSources = {
  /** `mise.toml` の内容。 */
  readonly miseToml: string;
  /** `package.json` の内容。 */
  readonly packageJson: string;
};

type Semver = { readonly major: number; readonly minor: number; readonly patch: number };

/** `engines.node` に許す形式（下限のみの指定）。 */
const ENGINES_FORM = ">=<major>.<minor>.<patch>";

/** `@types/node` に許す形式（メジャー固定のキャレット範囲）。 */
const TYPES_FORM = "^<major>.<minor>.<patch>";

/**
 * `mise.toml` の `[tools]` テーブルから `node` の固定バージョンを取り出す。
 *
 * TOML パーサーは導入せず行走査で解く（依存を増やさないため）。`[tools]` 以外のテーブル
 * （`[settings]` など）の同名キーを拾わないよう、現在のテーブル名を追跡する。
 * `wrangler = { version = "..." }` のようなインラインテーブルや
 * `"npm:typescript-language-server" = "..."` のような引用符付きキーは `node` に一致しない。
 */
export function extractMiseNodePin(miseToml: string): string | undefined {
  let table = "";

  for (const rawLine of miseToml.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    if (line.startsWith("[")) {
      // 表 / 配列表のヘッダー行。末尾コメント付き（`[settings] # ...`）も表名として読む。
      // 認識できない形（`[[foo]]` など）は「直前の表の続き」とは見なさず表名を捨てる。
      // 続きと見なすと、別の表の `node = "..."` を [tools] の値として誤読してしまう。
      const tableMatch = /^\[([^\]]+)]\s*(?:#.*)?$/.exec(line);
      table = tableMatch?.[1] ?? "";
      continue;
    }

    if (table !== "tools") continue;

    const nodeMatch = /^node\s*=\s*"([^"]+)"/.exec(line);
    if (nodeMatch?.[1] !== undefined) return nodeMatch[1];
  }

  return undefined;
}

/** `<major>.<minor>.<patch>` を数値へ分解する。形式が違えば undefined。 */
function parseSemver(value: string, pattern: RegExp): Semver | undefined {
  const match = pattern.exec(value);
  const [, major, minor, patch] = match ?? [];
  if (major === undefined || minor === undefined || patch === undefined) return undefined;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

/** a が b 以上かを比較する。 */
function isAtLeast(a: Semver, b: Semver): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}

function formatSemver({ major, minor, patch }: Semver): string {
  return `${String(major)}.${String(minor)}.${String(patch)}`;
}

/**
 * `package.json` から検査に使う 2 つの値を取り出す。個々のフィールドの欠落・型不一致は
 * undefined に倒すが、JSON 自体が読めない場合は undefined を返して呼び出し側に区別させる
 * （「フィールドが無い」と報告すると、実際は構文エラーなのに存在するフィールドを探させてしまう）。
 */
function readPackageFields(packageJson: string):
  | {
      readonly engines: string | undefined;
      readonly types: string | undefined;
    }
  | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(packageJson);
  } catch {
    return undefined;
  }

  // 配列・null・プリミティブはいずれも package.json として不正なので undefined に倒す。
  // `typeof [] === "object"` のため Array.isArray も見る（配列を通すと「フィールドが
  // 定義されていません」という事実と異なる報告になる）。
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;

  // 型アサーションを使わず `in` による絞り込みで unknown から値を取り出す
  // （oxlint の typescript/no-unsafe-type-assertion に合わせる）。
  let engines: string | undefined;
  if ("engines" in parsed) {
    const enginesValue = parsed.engines;
    if (typeof enginesValue === "object" && enginesValue !== null && "node" in enginesValue) {
      const nodeValue = enginesValue.node;
      if (typeof nodeValue === "string") engines = nodeValue;
    }
  }

  let types: string | undefined;
  if ("devDependencies" in parsed) {
    const devDependenciesValue = parsed.devDependencies;
    if (
      typeof devDependenciesValue === "object" &&
      devDependenciesValue !== null &&
      "@types/node" in devDependenciesValue
    ) {
      const typesValue = devDependenciesValue["@types/node"];
      if (typeof typesValue === "string") types = typesValue;
    }
  }

  return { engines, types };
}

/**
 * 整合検査を実行し、問題を人が読めるメッセージの配列で返す。
 * 空配列なら整合している。
 */
export function checkNodeVersionParity(sources: NodeVersionSources): readonly string[] {
  const problems: string[] = [];

  const misePin = extractMiseNodePin(sources.miseToml);
  const fields = readPackageFields(sources.packageJson);
  if (fields === undefined) {
    problems.push(
      "package.json: JSON オブジェクトとして解析できません（構文を確認してください）。",
    );
    return problems;
  }
  const { engines, types } = fields;

  // ---- 形式の検査（値が取れなければメジャー比較まで進めない）----
  let miseVersion: Semver | undefined;
  if (misePin === undefined) {
    problems.push("mise.toml: [tools] テーブルに node のバージョン指定が見つかりません。");
  } else {
    miseVersion = parseSemver(misePin, /^(\d+)\.(\d+)\.(\d+)$/);
    if (miseVersion === undefined) {
      problems.push(
        `mise.toml: node は <major>.<minor>.<patch> で固定してください（実際: "${misePin}"）。`,
      );
    }
  }

  let enginesLowerBound: Semver | undefined;
  if (engines === undefined) {
    problems.push("package.json: engines.node が文字列として定義されていません。");
  } else {
    enginesLowerBound = parseSemver(engines, /^>=(\d+)\.(\d+)\.(\d+)$/);
    if (enginesLowerBound === undefined) {
      problems.push(
        `package.json: engines.node は ${ENGINES_FORM} 形式にしてください（実際: "${engines}"）。`,
      );
    }
  }

  let typesVersion: Semver | undefined;
  if (types === undefined) {
    problems.push('package.json: devDependencies["@types/node"] が定義されていません。');
  } else {
    typesVersion = parseSemver(types, /^\^(\d+)\.(\d+)\.(\d+)$/);
    if (typesVersion === undefined) {
      problems.push(
        `package.json: @types/node は ${TYPES_FORM} 形式にしてください（実際: "${types}"）。`,
      );
    }
  }

  if (miseVersion === undefined || enginesLowerBound === undefined || typesVersion === undefined) {
    return problems;
  }

  // ---- 1. メジャーの一致 ----
  const majors = [miseVersion.major, enginesLowerBound.major, typesVersion.major];
  const majorsMatch = new Set(majors).size === 1;
  if (!majorsMatch) {
    problems.push(
      // 対処（実行環境と型をまとめて更新する）は CLI 側が末尾にまとめて出すため、ここでは
      // 繰り返さず「何がどうずれているか」だけを示す。
      "Node のメジャーバージョンが一致していません。\n" +
        `  mise.toml       node         = "${formatSemver(miseVersion)}"   -> major ${String(miseVersion.major)}\n` +
        `  package.json    engines.node = ">=${formatSemver(enginesLowerBound)}" -> major ${String(enginesLowerBound.major)}\n` +
        `  package.json    @types/node  = "^${formatSemver(typesVersion)}"  -> major ${String(typesVersion.major)}`,
    );
  }

  // ---- 2. mise の Node が engines.node の下限を満たすか ----
  if (!isAtLeast(miseVersion, enginesLowerBound)) {
    problems.push(
      `mise.toml の node (${formatSemver(miseVersion)}) が ` +
        `package.json の engines.node (>=${formatSemver(enginesLowerBound)}) を満たしていません。`,
    );
  }

  // ---- 3. 型が実行環境より先行していないか（同一メジャー内の片側制約）----
  // 3 者のメジャーが揃っているときだけ評価する。揃っていなければ 1 が根本の不整合を報告して
  // おり、minor の先行はメジャーを揃えた後に再評価すべき二次的な条件。`types.major ===
  // mise.major` だけを条件にすると、engines.node 側だけメジャーがずれている場合に 1 と 3 が
  // 同時に出る（実測で確認）。
  if (majorsMatch && typesVersion.minor > miseVersion.minor) {
    problems.push(
      `@types/node (^${formatSemver(typesVersion)}) が mise.toml の node ` +
        `(${formatSemver(miseVersion)}) より新しいマイナーを要求しています。\n` +
        "  型が実行環境より先行すると、実行環境に無い API が型検査を通ります" +
        `（Node ${String(miseVersion.major)}.${String(miseVersion.minor)} 系に ` +
        `${String(typesVersion.major)}.${String(typesVersion.minor)} 系で追加された API は存在しません）。\n` +
        `  mise.toml の node を ${String(typesVersion.major)}.${String(typesVersion.minor)} 系以降へ` +
        "同じ変更で上げるか、@types/node を据え置いてください。\n" +
        "  逆向き（型のマイナーが古い）は誤った通過を招かないため許容しています。",
    );
  }

  return problems;
}
