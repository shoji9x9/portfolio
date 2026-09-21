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

## pnpm 12 系を保留している理由

pnpm 本体は `mise.toml` の `minimum_release_age`（7 日）を満たす 11 系の最新に留め、12 系へは上げない
（`mise.toml` の `pnpm`・`package.json` の `packageManager` / `devEngines`）。**12 系にすると
Dependabot の npm 更新 PR が作られなくなる**ため。経緯は次のとおり。

| 日付       | 出来事                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 2026-09-07 | 12.1.0 を見送り 11 系に留めた（Issue #98）。Dependabot がネイティブバイナリを取得できず失敗する |
| 2026-09-19 | 上流の対応を受けて 12.4.1 を採用した（Issue #105）が、Dependabot が別の理由で全件失敗した       |
| 2026-09-19 | 11.26.0 へ戻した（Issue #109）                                                                  |

### 1 回目の失敗: ネイティブバイナリを取得できない（2026-09-07、解消済み）

12 系は `@pnpm/exe.<platform>` を optionalDependencies に持ち、`bin` はプレースホルダーで、
初回実行時にネイティブバイナリを取得する。Dependabot は `corepack install pnpm@<version>
--global --cache-only` で導入するため、実行時取得がサンドボックスのネットワーク制限に阻まれた。

```text
pnpm -v → exit 1
  Could not download the pnpm 12.1.0 binary:
    Could not reach https://registry.npmjs.org/@pnpm/exe.linux-x64/12.1.0: fetch failed
WARN pnpm (unknown version) does not support minimumReleaseAge ...
ERROR Dependabot::SharedHelpers::HelperSubprocessFailed
```

pnpm のバージョンを判定できないことで、transitive 依存に対する `minimumReleaseAge` の cooldown も
無効化されていた（WARN 行）。これは上流で解消した。
[dependabot/dependabot-core#16095](https://github.com/dependabot/dependabot-core/issues/16095) が
2026-09-15 に completed でクローズされ、
[#16169](https://github.com/dependabot/dependabot-core/pull/16169)（`SUPPORTED_VERSIONS` に `PNPM_V12`）と
[#16170](https://github.com/dependabot/dependabot-core/pull/16170)（バイナリ取得をプロキシ経由に）が
入った。2026-09-19 の実ジョブでもバイナリ取得は `200` で成功し、WARN も出なかった。

### 2 回目の失敗: `minimumReleaseAgeStrict` と `--no-save` の衝突（2026-09-19、未解消）

12.4.1 を採用した直後の Dependabot ジョブ（run 35430039172）で、更新候補 8 件がすべて次で失敗し、
PR は 1 件も作られなかった。更新先はいずれも公開から 7 日以上経った版だった。

```text
pnpm update <pkg>@<ver> --lockfile-only --no-save -r → exit 1
ERR_PNPM_STRICT_MIN_RELEASE_AGE_REQUIRES_SAVE
  minimumReleaseAgeStrict cannot be combined with --no-save: approval
  would require writing to minimumReleaseAgeExclude in pnpm-workspace.yaml
```

12 系では `minimumReleaseAgeStrict` が既定で有効として振る舞い、Dependabot が付ける `--no-save` と
両立しない。一時ディレクトリーにこのリポジトリーの `package.json` / `pnpm-lock.yaml` /
`pnpm-workspace.yaml` を複製して測った結果は次のとおり。

| 操作                                                                        | 11.25.0 / 11.26.0                            | 12.4.1（既定）     | 12.4.1 + `minimumReleaseAgeStrict: false` |
| --------------------------------------------------------------------------- | -------------------------------------------- | ------------------ | ----------------------------------------- |
| `pnpm update knip@6.35.1 --lockfile-only --no-save -r`（Dependabot と同形） | 成功                                         | 失敗（上のエラー） | 成功                                      |
| 公開 7 日未満の `wrangler@4.135.0` を明示して `pnpm add -D`                 | `ERR_PNPM_NO_MATURE_MATCHING_VERSION` で拒否 | 未測定             | **追加できる**                            |

`minimumReleaseAgeStrict: false` は Dependabot を通すが、公開直後の版を明示指定したときに待機ゲートを
すり抜ける。11 系より防御が弱くなり、「例外で緩めない」方針とも合わないため採らない。
なお `--config.minimumReleaseAgeStrict=false` のコマンドライン上書きは `pnpm config get` で
読まれていなかったため、測定は `pnpm-workspace.yaml` への記述で行った。

### 12 系へ上げ直す条件

Dependabot が 12 系の既定（strict）の下で `--no-save` を使わずに更新できるようになったことを、
dependabot-core の変更で確認する。上げ直したら main へのマージ後に npm の「Check for updates」を
手動実行し、ジョブログに `HelperSubprocessFailed` が出ないこと、更新候補があれば PR が作られることを
確かめる。失敗したら 11 系へ戻し、この節へ観測したログを追記する。

`mise outdated` ワークフローは方針を読まないので、メジャー更新を検出すると Issue に出し続ける。
これは意図した挙動（メジャー更新の通知を落とさない）であり、採否の判断はこの節を根拠に行う。

## vite は Vite+ core のエイリアスで管理する

`package.json` の `vite` は上流 vite ではなく **Vite+ core のエイリアス**で、版は `mise.toml` の
`viteplus` と完全一致させる（範囲指定にしない）。

```json
"vite": "npm:@voidzero-dev/vite-plus-core@0.3.1"
```

### なぜ必要か

viteplus 0.3.1 以降、`vp dev` / `vp build` / `vp preview` / `vp pack` は `node_modules/vite` が
`@voidzero-dev/vite-plus-core@<CLI と同一版>` であることを name / version の厳密一致で要求し、上流 vite が
入っていると起動前に失敗する（`packages/cli/src/resolve-core.ts`。PR voidzero-dev/vite-plus#2617）。
狙いは vite ランタイムの同一性（RFC `vite-core-module-identity`）で、上流はこれを 0.3.1 の
「TanStack Start の 404 修正」としてのみ告知し、破壊的変更には挙げていない。0.3.2 / 0.3.3 も main の
同じ実装とスナップショット（`core_resolution_upstream_vite`）を持つため、待っても解消しない。

実測（2026-09-21、Issue #127。node 26.8.2・同一 node_modules・`pnpm run build`）:

| viteplus | `package.json` の `vite`                 | 結果                                                                        |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 0.3.0    | `^8.3.0`（上流 vite）                    | 成功                                                                        |
| 0.3.1    | `^8.3.0`（上流 vite）                    | 失敗（`Expected @voidzero-dev/vite-plus-core@0.3.1, but found vite@8.3.0`） |
| 0.3.1    | `npm:@voidzero-dev/vite-plus-core@0.3.1` | 成功                                                                        |

エイリアス先は MIT で、`pnpm audit signatures` と `license:check` も通る。

### 上げるときの手順（lockstep）

1. `mise upgrade viteplus --bump` → `mise install`（`mise.lock` を追従させる）
2. `package.json` の `vite` のエイリアス版を同じ版へ書き換える → `pnpm install`
3. 両方を同じコミットに含める

ずれた組み合わせは CI の Build（`vp build`）が上の厳密一致で必ず落とす。更新通知は
`outdated.yml`（mise の `viteplus`）が担い、Issue 本文が `vite` のエイリアスを対で上げるよう促す。
Dependabot 側は `@voidzero-dev/vite-plus-core` を ignore してあるが、既定経路では
エイリアス依存そのものが拾われないため、この ignore は実名へ解く経路が有効になった場合の保険である
（一次情報は [dependabot.yml](../.github/dependabot.yml) のコメント、構図は上流
[voidzero-dev/vite-plus#2356](https://github.com/voidzero-dev/vite-plus/issues/2356)）。

### peer 範囲を許可している理由

エイリアス先の版は Vite+ の版（0.3.x）なので、`vite: ^8.0.0` 等を要求する peer
（@vitejs/plugin-react / @rolldown/plugin-babel / @tailwindcss/vite / vitest / @vitest/mocker の 5 件）は
構造上満たせない。実際の互換性は Vite+ が同梱する vite の版が担保するため、`pnpm-workspace.yaml` の
`peerDependencyRules.allowedVersions` で許可する。

許可は `vite: "*"`（peer 名だけ）ではなく **要求元ごと**（`<要求元>>vite`）に書く。peer 名だけだと
今後追加するパッケージの vite peer 不一致まで黙って通り、判断の機会が消える。要求元を列挙しておけば
未登録のパッケージが入ったときだけ警告が出る。

```yaml
peerDependencyRules:
  allowedVersions:
    "@rolldown/plugin-babel>vite": "*"
    "@tailwindcss/vite>vite": "*"
    "@vitejs/plugin-react>vite": "*"
    "@vitest/mocker>vite": "*"
    "vitest>vite": "*"
```

実測（2026-09-21・pnpm 11.26.0・同一 node_modules）:

| `allowedVersions`       | `pnpm peers check`                                              |
| ----------------------- | --------------------------------------------------------------- |
| なし                    | 上記 5 件の unmet peer 警告                                     |
| `vite: "*"`             | clean                                                           |
| 上記 5 件（要求元ごと） | clean                                                           |
| 上記から 1 件抜く       | `unmet peer vite / Installed: 0.3.1 / Wanted: ^8.0.0` で exit 1 |

最後の行が故障注入で、この指標が「未登録の要求元」を実際に落とせることの確認。判定を CI へ効かせるため
`pnpm peers check` を `ci.yml` の `check` ジョブに入れている（`pnpm install` は unmet peer でも exit 0 の
ため、これが無いと許可漏れが CI を素通りする）。対象を増やすときは `pnpm peers check` の出力にある要求元を足す。これは release-age ゲートとは別物で、
`minimumReleaseAge` の例外は使っていない。

### 採らなかった手段

- **`vp migrate`**: `vitest` を Vite+ 同梱版（4.x）へ固定し、pnpm の `minimumReleaseAgeExclude` へ
  vitest 系の免除を書き込む（`VITEST_AGE_GATE_EXEMPT_PACKAGES`）。当リポジトリーは vitest 5 系を
  `vitest run` で直接実行しており、年齢ゲートの例外も使わない方針なので、`vite` のエイリアスだけを
  手で入れた。実測でこの形でも build / typecheck / lint / format:check / test / knip /
  audit signatures / license:check がすべて通る。
- **`overrides` による `vite` の強制解決**: 上流の migrate は書き込むが、`pnpm why vite` が core 1 版
  のみを示し上流 vite を持ち込む依存が無いため不要。lockstep させる箇所を増やさない。

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
