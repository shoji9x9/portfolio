import { describe, expect, it } from "vitest";

import { extractMiseToolPin } from "./mise-toml";
import { checkToolVersionParity } from "./tool-version-parity";

/** 実際の mise.toml と同じ構造（[tools] の後に [settings] が続く）の最小サンプル。 */
function miseToml(pnpm: string, viteplus: string): string {
  return [
    "# コメント行",
    "[tools]",
    'node = "26.13.1"',
    `pnpm = "${pnpm}"`,
    'wrangler = { version = "4.165.0", allow_builds = ["esbuild"] }',
    `viteplus = "${viteplus}"`,
    '"npm:typescript-language-server" = "6.1.0"',
    "",
    "[settings]",
    'minimum_release_age = "7 days"',
  ].join("\n");
}

type PackageOptions = {
  readonly packageManager?: string;
  readonly devEnginesName?: string;
  readonly devEnginesVersion?: string;
  readonly vite?: string;
};

function packageJson(options: PackageOptions): string {
  return JSON.stringify({
    devDependencies: options.vite === undefined ? {} : { vite: options.vite },
    devEngines: {
      packageManager: {
        name: options.devEnginesName,
        version: options.devEnginesVersion,
        onFail: "warn",
      },
    },
    packageManager: options.packageManager,
  });
}

const aligned: PackageOptions = {
  packageManager: "pnpm@12.22.0",
  devEnginesName: "pnpm",
  devEnginesVersion: "12.22.0",
  vite: "npm:@voidzero-dev/vite-plus-core@1.6.0",
};

function check(toml: string, options: PackageOptions): readonly string[] {
  return checkToolVersionParity({ miseToml: toml, packageJson: packageJson(options) });
}

describe("extractMiseToolPin", () => {
  it("[tools] の裸のキーを取り出す", () => {
    expect(extractMiseToolPin(miseToml("12.22.0", "1.6.0"), "viteplus")).toBe("1.6.0");
  });

  it("引用符付きキーを取り出す", () => {
    expect(extractMiseToolPin(miseToml("12.22.0", "1.6.0"), "npm:typescript-language-server")).toBe(
      "6.1.0",
    );
  });

  it("インラインテーブルは対象外", () => {
    expect(extractMiseToolPin(miseToml("12.22.0", "1.6.0"), "wrangler")).toBeUndefined();
  });

  it("キー名の前方一致では拾わない", () => {
    const toml = ["[tools]", 'pnpmx = "1.0.0"'].join("\n");
    expect(extractMiseToolPin(toml, "pnpm")).toBeUndefined();
  });

  it("[tools] 以外のテーブルの同名キーは拾わない", () => {
    const toml = ["[tools]", 'node = "26.13.1"', "[settings]", 'pnpm = "12.22.0"'].join("\n");
    expect(extractMiseToolPin(toml, "pnpm")).toBeUndefined();
  });
});

describe("checkToolVersionParity", () => {
  it("すべて一致していれば問題なし", () => {
    expect(check(miseToml("12.22.0", "1.6.0"), aligned)).toEqual([]);
  });

  it("mise の pnpm だけ上げた状態を packageManager と devEngines の両方で検出する（Issue #219 の形）", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), {
      ...aligned,
      packageManager: "pnpm@12.18.0",
      devEnginesVersion: "12.18.0",
    });
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('packageManager = "pnpm@12.18.0"');
    expect(problems[1]).toContain('devEngines.packageManager.version = "12.18.0"');
  });

  it("devEngines だけ取り残された状態を検出する", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), {
      ...aligned,
      devEnginesVersion: "12.18.0",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("devEngines.packageManager.version");
  });

  it("viteplus だけ上げた状態を検出する", () => {
    const problems = check(miseToml("12.22.0", "1.7.0"), aligned);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('viteplus = "1.7.0"');
  });

  it("vite エイリアスだけ上げた状態を検出する", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), {
      ...aligned,
      vite: "npm:@voidzero-dev/vite-plus-core@1.7.0",
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("@1.7.0");
  });

  it("vite が上流 vite（エイリアスでない）なら形式エラーにする", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), { ...aligned, vite: "^8.3.0" });
    expect(problems).toEqual([expect.stringContaining("devDependencies.vite は")]);
  });

  it("packageManager が pnpm でなければ形式エラーにする", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), {
      ...aligned,
      packageManager: "npm@11.0.0",
    });
    expect(problems).toEqual([expect.stringContaining("packageManager は")]);
  });

  it("devEngines の name が pnpm でなければ形式エラーにする", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), { ...aligned, devEnginesName: "npm" });
    expect(problems).toEqual([expect.stringContaining('name は "pnpm"')]);
  });

  it("値が欠落していればそれぞれ報告する", () => {
    const problems = check(miseToml("12.22.0", "1.6.0"), {});
    expect(problems).toHaveLength(3);
    expect(problems.join("\n")).toContain("未定義");
  });

  it("mise.toml に pnpm / viteplus が無ければ報告する", () => {
    const problems = check(["[tools]", 'node = "26.13.1"'].join("\n"), aligned);
    expect(problems).toEqual([
      expect.stringContaining("pnpm のバージョン指定"),
      expect.stringContaining("viteplus のバージョン指定"),
    ]);
  });

  it("package.json が JSON オブジェクトでなければ報告する", () => {
    for (const broken of ["{", "[]", "null"]) {
      expect(
        checkToolVersionParity({ miseToml: miseToml("12.22.0", "1.6.0"), packageJson: broken }),
      ).toEqual([expect.stringContaining("JSON オブジェクトとして解析できません")]);
    }
  });
});
