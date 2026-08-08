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

## transitive 依存を patched 版へ上げるとき

脆弱性対応で transitive dependency を patched 版へ上げるときは、以下を実行知識の起点にする。
詳細な手段の優先順（親の remove + 同一 range での add し直し、surgical hand-edit、lockfile 完全再生成）は
[pnpm-transitive-update.md](../.agents/skills/dependabot-alert-issue/references/pnpm-transitive-update.md) を参照する。

- **バージョンを明示しない `pnpm update <pkg> --depth Infinity` を第一候補にする。** 上げたい版が分かっていても
  range 指定を足さず、「range 内の最新」を pnpm に選ばせる。transitive にバージョンを明示すると据え置かれる。
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
