# 依存導入の方針

既存のサプライチェーン対策とライセンス検査を、依存を追加・更新するときの判断基準として集約する。新たな許容範囲は定めない。

## 導入前の確認

1. 既存の依存または標準 Web API で目的を満たせないかを確認する。
2. 候補の配布元・メンテナンス状況・ライセンスを確認し、[ライセンス方針](../.github/license-policy.json) に反しないことを確かめる。
3. 依存の追加理由、代替候補と不採用理由を `.replace/dependencies.md` に記録する。機能固有の判断は `parity-replace` の実装前に同じ基準で行う。

## 導入と継続的な検査

- JavaScript 依存は pnpm だけで管理し、lockfile を更新する。`pnpm-workspace.yaml` の `minimumReleaseAge: 10080` と build script の許可リストを維持し、例外で緩めない。
- mise 管理の CLI は `mise.toml` の `minimum_release_age` に従う。
- CI の Dependency Review、ライセンス検査、Dependabot による更新を維持する。AGPL 等のリスクがあるライセンスは許可しない。
- 依存更新であっても、更新内容とライセンスを確認し、通常の品質チェックを通す。

## pnpm のメジャー更新を保留している理由

pnpm は `minimum_release_age`（7 日）を満たす 11 系の最新に留め、12 系へは上げない
（2026-09-07 時点、`mise.toml` の `pnpm`・
`package.json` の `packageManager` / `devEngines`）。**Dependabot が pnpm 12 に未対応で、
上げると npm 依存の更新 PR が作られなくなる**ため。

- GitHub のドキュメント「Supported ecosystems」が npm エコシステムで挙げる pnpm は v7〜v10。
  dependabot-core の `PNPMPackageManager::SUPPORTED_VERSIONS` も 7〜11 で `PNPM_V12` を持たない。
- 対応は [dependabot/dependabot-core#16095](https://github.com/dependabot/dependabot-core/issues/16095) で未解決。

失敗の実体は pnpm 12 のパッケージ構造変更にある。11 系の npm パッケージは依存を持たない自己完結
JS だが、12 系は `@pnpm/exe.<platform>` を optionalDependencies に持ち、`bin` はプレースホルダーで、
初回実行時にネイティブバイナリを取得する。Dependabot は `corepack install pnpm@<version>
--global --cache-only` で導入するため依存も install スクリプトも入らず、実行時取得が
サンドボックスのネットワーク制限に阻まれる。`packageManager: "pnpm@12.1.0"` を置いた
リポジトリーの実ジョブログで観測した失敗は次のとおり。

```text
pnpm -v → exit 1
  Downloading the pnpm 12.1.0 binary for linux-x64...
  Could not download the pnpm 12.1.0 binary:
    Could not reach https://registry.npmjs.org/@pnpm/exe.linux-x64/12.1.0: fetch failed
WARN pnpm (unknown version) does not support minimumReleaseAge ...
pnpm update <pkg> --lockfile-only --no-save -r → exit 1
ERROR Dependabot::SharedHelpers::HelperSubprocessFailed
```

更新 PR が止まるだけでなく、pnpm のバージョンを判定できないことで
**transitive 依存に対する `minimumReleaseAge` の cooldown も無効化される**（上のログ 2 行目の WARN）。
サプライチェーン対策そのものが静かに落ちるため、Dependabot 側が対応するまで上げない。

`mise outdated` ワークフローは方針を読まないので、毎週 pnpm 12 への更新を Issue に出し続ける。
これは意図した挙動（メジャー更新の通知を落とさない）であり、採否の判断はこの節を根拠に行う。

## transitive 依存を patched 版へ上げるとき

脆弱性対応で transitive dependency を patched 版へ上げるときは、以下を実行知識の起点にする。
詳細な手段の優先順（親の remove + 同一 range での add し直し、surgical hand-edit、lockfile 完全再生成）は
[pnpm-transitive-update.md](../.agents/skills/dependabot-alert-issue/references/pnpm-transitive-update.md) を参照する。

- **バージョンを明示しない `pnpm update <pkg> --depth Infinity` を第一候補にする。** 上げたい版が分かっていても
  range 指定を足さず、「range 内の最新」を pnpm に選ばせる。バージョンを明示すると、無指定なら到達する版へも
  上がらないことがある（実測: 下表の nanoid。plain transitive・ゲート無効条件で観測）。
- **リリース年齢ゲート（`minimumReleaseAge`）に阻まれても `pnpm update` は無言で旧版を据え置く。**
  親の range が既存の成熟版を満たすため、エラーは出ない。「エラーが出ないから更新された」と判断しない。
  判断の権威は `git diff pnpm-lock.yaml`。
- **「ゲートで止まった」のか「経路が効かない」のかは `pnpm add` で切り分ける。** `add` はゲート違反時に
  `ERR_PNPM_NO_MATURE_MATCHING_VERSION` を公開日時と cutoff つきで返すため、待てば解決するのかが分かる。
- ゲートは例外（`minimumReleaseAgeExclude`）で緩めず、cutoff の経過を待つ。`pnpm.overrides` による強制解決も採らない。

実測の条件と結果は次のとおり（いずれも lockfile 差分で判定）。

| 対象            | 条件                                         | コマンド                                                     | 結果                     |
| --------------- | -------------------------------------------- | ------------------------------------------------------------ | ------------------------ |
| nanoid（#62）   | ゲート無効（`--config.minimumReleaseAge=0`） | `pnpm update nanoid --depth Infinity --lockfile-only`        | `3.3.16` → `3.3.18` 到達 |
| nanoid（#62）   | ゲート無効（同上）                           | `pnpm update nanoid@3.3.17 --depth Infinity --lockfile-only` | `3.3.16` 据え置き        |
| fast-uri（#55） | ゲート有効・cutoff 前                        | `pnpm update fast-uri --depth Infinity --lockfile-only`      | `3.1.4` 据え置き（無言） |
| fast-uri（#55） | ゲート有効・cutoff 後                        | `pnpm update fast-uri --depth Infinity --lockfile-only`      | `3.1.4` → `3.1.5` 到達   |

根拠は [AGENTS.md](../AGENTS.md) の「サプライチェーン対策」と、[pnpm-workspace.yaml](../pnpm-workspace.yaml)、[ライセンス方針](../.github/license-policy.json) である。
