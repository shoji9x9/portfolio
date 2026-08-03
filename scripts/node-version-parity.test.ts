import { describe, expect, it } from "vitest";

import { checkNodeVersionParity, extractMiseNodePin } from "./node-version-parity";

/** 実際の mise.toml と同じ構造（[tools] の後に [settings] が続く）の最小サンプル。 */
function miseToml(nodePin: string): string {
  return [
    "# コメント行",
    "[tools]",
    `node = "${nodePin}"`,
    'pnpm = "11.17.0"',
    'wrangler = { version = "4.114.0", allow_builds = ["esbuild"] }',
    '"npm:typescript-language-server" = "5.3.0"',
    "",
    "[settings]",
    'minimum_release_age = "7 days"',
  ].join("\n");
}

function packageJson(engines: string, types: string): string {
  return JSON.stringify({
    devDependencies: { "@types/node": types },
    engines: { node: engines },
  });
}

describe("extractMiseNodePin", () => {
  it("[tools] の node を取り出す", () => {
    expect(extractMiseNodePin(miseToml("26.5.0"))).toBe("26.5.0");
  });

  it("[tools] 以外のテーブルの node は拾わない", () => {
    const toml = ["[settings]", 'node = "24.18.0"'].join("\n");
    expect(extractMiseNodePin(toml)).toBeUndefined();
  });

  it("コメントアウトされた node は拾わない", () => {
    const toml = ["[tools]", '# node = "24.18.0"', 'pnpm = "11.17.0"'].join("\n");
    expect(extractMiseNodePin(toml)).toBeUndefined();
  });

  it("末尾コメント付きのヘッダー行も表名として読む", () => {
    const toml = ["[tools] # ランタイム", 'node = "26.5.0"'].join("\n");
    expect(extractMiseNodePin(toml)).toBe("26.5.0");
  });

  it("末尾コメント付きヘッダーの後の別テーブルの node は拾わない", () => {
    const toml = [
      "[tools]",
      'pnpm = "11.17.0"',
      "[settings] # サプライチェーン対策",
      'node = "24.18.0"',
    ].join("\n");
    expect(extractMiseNodePin(toml)).toBeUndefined();
  });

  it("配列表のヘッダーの後の node は拾わない（表名を引き継がない）", () => {
    const toml = ["[tools]", 'pnpm = "11.17.0"', "[[hooks]]", 'node = "24.18.0"'].join("\n");
    expect(extractMiseNodePin(toml)).toBeUndefined();
  });
});

describe("checkNodeVersionParity", () => {
  it("3 者のメジャーが一致し mise の node が下限を満たすなら問題なし", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^26.0.0"),
    });
    expect(problems).toEqual([]);
  });

  it("mise の node が engines.node の下限より新しいのは許容する", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.7.1"),
      packageJson: packageJson(">=26.5.0", "^26.0.0"),
    });
    expect(problems).toEqual([]);
  });

  it("型のマイナーが実行環境より古いのは許容する（安全側）", () => {
    // 実リポジトリーの状態。@types/node は Node より遅れて公開されるため常にこの向きになる。
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^26.1.1"),
    });
    expect(problems).toEqual([]);
  });

  it("型と実行環境のマイナーが同じなら問題なし", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^26.5.3"),
    });
    expect(problems).toEqual([]);
  });

  it("型のマイナーが実行環境より先行していると検出する", () => {
    // dependabot-automerge は semver-minor を自動マージ対象にするため、この経路は
    // 人のレビューを経ずに入り得る。実行環境に無い API が型検査を通る状態になる。
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^26.9.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("より新しいマイナーを要求しています");
    expect(problems[0]).toContain("26.9 系以降");
  });

  it("マイナー先行の判定に patch は影響しない", () => {
    // @types/node の patch は DefinitelyTyped 側の型修正で Node の patch とは対応しない。
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^26.5.9"),
    });
    expect(problems).toEqual([]);
  });

  it("型のメジャーがずれているときはマイナー先行を重ねて報告しない", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "^27.9.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("メジャーバージョンが一致していません");
  });

  it("engines.node 側だけメジャーがずれているときもマイナー先行を重ねて報告しない", () => {
    // 検査 3 の条件を `types.major === mise.major` だけにすると、型と mise のメジャーは
    // 揃っているため 1 と 3 が同時に出てしまう（実測）。3 者一致を条件にする必要がある。
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=24.18.0", "^26.9.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("メジャーバージョンが一致していません");
    expect(problems.join("\n")).not.toContain("より新しいマイナーを要求しています");
  });

  it("@types/node だけメジャーを上げた状態を検出する（PR #36 の形）", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("24.18.0"),
      packageJson: packageJson(">=24.18.0", "^26.0.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("メジャーバージョンが一致していません");
    expect(problems[0]).toContain("major 24");
    expect(problems[0]).toContain("major 26");
  });

  it("engines.node だけ取り残された状態を検出する", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=24.18.0", "^26.0.0"),
    });
    // mise の node は下限を満たすため、報告はメジャー不一致の 1 件だけ。
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("メジャーバージョンが一致していません");
  });

  it("mise の node が engines.node の下限を満たさないと検出する", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.1.0"),
      packageJson: packageJson(">=26.5.0", "^26.0.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("満たしていません");
  });

  it("engines.node が下限指定でなければ形式エラーにする", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson("^26.0.0", "^26.0.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("engines.node は");
  });

  it("@types/node がキャレット範囲でなければ形式エラーにする", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: packageJson(">=26.5.0", "26.1.1"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@types/node は");
  });

  it("mise の node がピン留めされていなければ形式エラーにする", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26"),
      packageJson: packageJson(">=26.5.0", "^26.0.0"),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("node は <major>.<minor>.<patch>");
  });

  it("値が欠落していれば形式エラーを列挙し、メジャー比較まで進めない", () => {
    const problems = checkNodeVersionParity({ miseToml: "[settings]", packageJson: "{}" });
    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).not.toContain("メジャーバージョンが一致していません");
  });

  it("package.json が壊れていたら構文エラーとして報告する（フィールド欠落と混同しない）", () => {
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: "{ not json",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("JSON オブジェクトとして解析できません");
    expect(problems.join("\n")).not.toContain("定義されていません");
  });

  it("package.json のルートが配列なら構文・形式エラーとして扱う", () => {
    // typeof [] === "object" のため Array.isArray を見ないと、構文としては読めてしまい
    // 「フィールドが定義されていません」という事実と異なる報告になる。
    const problems = checkNodeVersionParity({
      miseToml: miseToml("26.5.0"),
      packageJson: "[]",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("JSON オブジェクトとして解析できません");
    expect(problems.join("\n")).not.toContain("定義されていません");
  });
});
