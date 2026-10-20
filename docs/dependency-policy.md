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

## pnpm 12 系の採用経緯

pnpm 本体は `mise.toml` の `minimum_release_age`（7 日）を満たす 12 系の最新を採る
（`mise.toml` の `pnpm`・`package.json` の `packageManager` / `devEngines`）。12 系は 2 回、
**Dependabot の npm 更新 PR が作られなくなる**ために見送った。経緯は次のとおり。

| 日付       | 出来事                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| 2026-09-07 | 12.1.0 を見送り 11 系に留めた（Issue #98）。Dependabot がネイティブバイナリを取得できず失敗する    |
| 2026-09-19 | 上流の対応を受けて 12.4.1 を採用した（Issue #105）が、Dependabot が別の理由で全件失敗した          |
| 2026-09-19 | 11.26.0 へ戻した（Issue #109）                                                                     |
| 2026-10-19 | 2 回目の失敗の上流修正を確認し、12.12.1 を採用した（Issue #163）                                   |
| 2026-10-19 | マージ後の Dependabot 実ジョブで 12.12.1 の更新が成功し、PR が作られることを確認した（Issue #167） |

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

### 2 回目の失敗: `minimumReleaseAgeStrict` と `--no-save` の衝突（2026-09-19、上流で修正済み）

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

### 12 系を採用した判断（2026-10-19、Issue #163）

当初の上げ直し条件は「Dependabot が strict の下で `--no-save` を使わずに更新できるようになったこと」だった。
上流の修正はこれとは形が違う。上流
[dependabot/dependabot-core#16375](https://github.com/dependabot/dependabot-core/issues/16375) は
2026-10-01 にクローズされ、[#16376](https://github.com/dependabot/dependabot-core/pull/16376) がマージされた。
修正は、**リポジトリー側の `minimumReleaseAge` が効く場合に、Dependabot の `update ... --no-save` にだけ
`--config.minimum-release-age-strict=false` を付ける**というもの（`install` と `audit --fix` は strict の
まま。待機日数は変えない。`--config` を kebab-case で渡すよう改め、pnpm 12 が camelCase を黙って
無視していた問題も直した）。さらに 2026-10-09 には、Dependabot の updater イメージが同梱する pnpm 自体が
12 系へ上がった（[#16513](https://github.com/dependabot/dependabot-core/pull/16513)）。

この修正の形で条件を満たしたとみなした。根拠は、Issue #144 で未確認として残した 2 点を次のとおり測ったこと（2 点目は手元で測れる範囲まで）。
測定は、このリポジトリーの `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` を一時ディレクトリーへ
複製して行った（`mise.toml` は含めず、cwd と pnpm の版・strict の設定値を最初に出力して確認した）。

| 操作（`pnpm update knip@<ver> --lockfile-only --no-save -r`）                                      | 11.28.4（main）                                         | 12.12.1                     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| 公開 1 日の 6.42.0、strict 既定                                                                    | 失敗（`ERR_PNPM_STRICT_MIN_RELEASE_AGE_REQUIRES_SAVE`） | 失敗（同じエラー）          |
| 公開 1 日の 6.42.0、`--config.minimum-release-age-strict=false`（#16376 後の Dependabot と同じ形） | 成功（**6.42.0 が入る**）                               | 成功（**6.42.0 が入る**）   |
| 公開 13 日の 6.40.0（6.39.0 から。`package.json` も 6.40.0 へ書き換え）、strict 既定               | 成功（6.40.0 に更新される）                             | 成功（6.40.0 に更新される） |

1. **strict を外した `--no-save` 更新で公開 7 日未満の版が入り得るか**: 明示した直接依存については入る。
   ただし挙動は 11.28.4 でも 12.12.1 でも同じだった。#16376 以降は 11 系でも strict を外して実行されるので、
   これは 12 系に固有の弱まりではなく、11 系に留めても防げない。直接依存の更新先は Dependabot の `cooldown`（`default-days: 7`）が待機させる。
   transitive 依存がこの経路で公開 7 日未満の版に解決されるかは測っていない（11 系・12 系とも同じ未確認）。
2. **GitHub の Dependabot に修正が反映されたか**: マージ前は手元で確かめられなかった。2026-10-19 に
   Dependabot が npm の更新 PR を 6 件作った（#157〜#162）ことは反映の証拠にならない。Dependabot が
   `cooldown` で選ぶ公開 7 日以上の版は、上の表のとおり strict 既定のままでも 11.28.4 で成功するため。
   ただし同じ表で、12.4.1 で全件失敗した「公開 7 日以上の版への strict 既定の更新」が 12.12.1 では成功した。
   2 回目の失敗の条件は、Dependabot 側の修正の反映を問わず手元の 12.12.1 では再現しない。
   GitHub 上での反映は、マージ後の実ジョブで確認した（次項）。

#### マージ後の確認（2026-10-19、Issue #167）

PR #165 のマージ後に npm の「Check for updates」を手動実行した
（[run 39254446356](https://github.com/shoji9x9/portfolio/actions/runs/39254446356)、main は 12.12.1）。
ジョブは success で、ログから次を確認した。

- `corepack install pnpm@12.12.1 --global --cache-only` が exit 0。1 回目の失敗（ネイティブバイナリを
  取得できない）は起きていない
- 更新コマンドは `pnpm update <pkg>@<ver> --lockfile-only --no-save -r --config.minimum-release-age-strict=false
  --config.trust-lockfile=true` の形で実行され、いずれも exit 0。**#16376 が GitHub 上で動いている**
- ログに `HelperSubprocessFailed` も `ERR_PNPM_*` も無い。`Filtered out N versions due to cooldown` が出ており、
  `cooldown` による除外が働いている
- 更新 PR #166（vitest グループ 5.0.3 → 5.0.4。5.0.4 は 2026-10-12 公開）が作られた

なお、11.28.4 だった同日朝の実ジョブ（run 39179477718）の更新コマンドにも
`--config.minimum-release-age-strict=false` が付いていた。#16376 は 12 系へ切り替える前から GitHub 上に
反映されていたことになる。

同じジョブで、更新の判断前に `pnpm --filter . peers check` が exit 1 で終わっていた。ジョブを止める失敗では
なく、直後の更新処理と PR 作成は進んでいる。経緯は次のとおり（dependabot-core の
`update_checker/version_resolver.rb` と、同じ操作の手元での再現による）。

- Dependabot は更新先の peer 依存の整合を確かめるため、依存を 1 つずつ `pnpm update <dep>@<ver> --lockfile-only`
  で試す。出力に `Run "pnpm peers check" to list them.` が含まれると、続けて `pnpm --filter . peers check` を実行する
- 今回は vitest グループのうち `@vitest/coverage-v8` だけを 5.0.4 にした段階で、peer の版が一時的に食い違った
  （coverage-v8 5.0.4 は vitest 5.0.4 を、vitest 5.0.3 は coverage-v8 5.0.3 を要求する）。グループの PR では
  両方を同時に上げるため、最終的な lockfile では解消している
- PR #165 マージ直後の main（8265b53）を一時ディレクトリーへ複製して同じ 2 コマンドを流すと、12.12.1 で同じ WARN と
  `peers check` の exit 1（unmet peer 2 件）が再現した。マージ前の main（07418e7）を 11.28.4 で流しても同じ結果に
  なり、**12 系に固有の挙動ではない**。11 系の朝のジョブ（2026-10-19T00:09Z 開始）で実行されなかったのは、
  5.0.4（2026-10-12T09:47Z 公開）が公開 7 日に満たず、vitest グループが `cooldown` で更新対象から外れていたため
- Dependabot がこの exit 1 をどう扱って更新を続けたかは、ログに終了コードしか出ないため確かめていない

この確認で、上の 2 点のうち GitHub 上の Dependabot への反映（2 点目）は確認済みになった。1 点目のうち transitive
依存の扱いは引き続き測っていない（11 系・12 系とも同じ）。今後 Dependabot の npm 更新が失敗した場合は、11 系の
最新（`minimum_release_age` を満たすもの）へ戻すかを判断し、この節へ観測したログを追記する。

`mise outdated` ワークフローは方針を読まないので、pnpm のメジャー更新（13 系など）も他のツールと同じく
Issue に出す。採否の判断は上の経緯を踏まえ、Dependabot の対応状況を一次情報で確かめてから行う。
採用した場合は、マージ後に上の「マージ後の確認」と同じく npm の「Check for updates」を手動実行し、
実ジョブのログで更新コマンドの終了コードと PR 作成を確かめる。

## vite は Vite+ core のエイリアスで管理する

`package.json` の `vite` は上流 vite ではなく **Vite+ core のエイリアス**で、版は `mise.toml` の
`viteplus` と完全一致させる（範囲指定にしない）。

```json
"vite": "npm:@voidzero-dev/vite-plus-core@1.1.0"
```

### なぜ必要か

viteplus 0.3.1 以降、`vp dev` / `vp build` / `vp preview` / `vp pack` は `node_modules/vite` が
`@voidzero-dev/vite-plus-core@<CLI と同一版>` であることを name / version の厳密一致で要求し、上流 vite が
入っていると起動前に失敗する（`packages/cli/src/resolve-core.ts`。PR voidzero-dev/vite-plus#2617）。
狙いは vite ランタイムの同一性（RFC `vite-core-module-identity`）で、上流はこれを 0.3.1 の
「TanStack Start の 404 修正」としてのみ告知し、破壊的変更には挙げていない。0.3.2 / 0.3.3 も main の
同じ実装とスナップショット（`core_resolution_upstream_vite`）を持つため、待っても解消しない。
1.0.0 でも同じ検査が残っていることを下の 2 回目の実測で確かめた（1.0.0 のリリースノートも、この検査の変更や
撤廃には触れていない）。

実測（2026-09-21、Issue #127。node 26.8.2・同一 node_modules・`pnpm run build`）:

| viteplus | `package.json` の `vite`                 | 結果                                                                        |
| -------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| 0.3.0    | `^8.3.0`（上流 vite）                    | 成功                                                                        |
| 0.3.1    | `^8.3.0`（上流 vite）                    | 失敗（`Expected @voidzero-dev/vite-plus-core@0.3.1, but found vite@8.3.0`） |
| 0.3.1    | `npm:@voidzero-dev/vite-plus-core@0.3.1` | 成功                                                                        |

実測（2026-10-12、Issue #149。node 26.10.0・pnpm 11.28.4。本体を複製した一時ディレクトリーで
`package.json` の `vite` だけを変えて `pnpm install` し、`vp build` と `vp dev` を実行。`vp preview` /
`vp pack` は未測定）:

| viteplus（CLI） | `package.json` の `vite`                 | `vp build` / `vp dev`                                                                               |
| --------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1.0.0           | `npm:@voidzero-dev/vite-plus-core@1.0.0` | 成功（対照）                                                                                        |
| 1.0.0           | `^8.3.0`（上流 vite。8.3.2 に解決）      | 失敗（`Expected @voidzero-dev/vite-plus-core@1.0.0, but found vite@8.3.2`）                         |
| 1.0.0           | `npm:@voidzero-dev/vite-plus-core@0.3.3` | 失敗（`Expected @voidzero-dev/vite-plus-core@1.0.0, but found @voidzero-dev/vite-plus-core@0.3.3`） |
| 0.3.3           | `npm:@voidzero-dev/vite-plus-core@1.0.0` | 失敗（`Expected @voidzero-dev/vite-plus-core@0.3.3, but found @voidzero-dev/vite-plus-core@1.0.0`） |

失敗はいずれも起動前で、ずれの向き（CLI だけ上げた・エイリアスだけ上げた）を問わず落ちる。
文言の末尾には CLI 1.0.0 / 0.3.3 とも ``Run `vp migrate` to align the Vite alias, then run `vp install`.``
が付く。このリポジトリーでは下の手順（lockstep）で両方を同じ版へ揃えて直す（`vp migrate` がここで
何を書き換えるかは未確認）。

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

エイリアス先の版は Vite+ の版（1.0.0 など）なので、`vite: ^8.0.0` 等を要求する peer
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

## 修正版が出ない advisory を無視するとき

この節の取り決めは、`pnpm audit` と Dependabot alerts のどちらで脆弱性を確かめるかに関わらず守る。

- 修正版が出る見込みが無く、このリポジトリーでは影響を許容できる advisory は、`pnpm-workspace.yaml` の
  `auditConfig.ignoreGhsas` に足して `pnpm audit` に報告させない。
- 足すときは、影響を許容できる理由と、判断を記録した Issue をコメントに書く。修正版が公開されたときと、
  どの依存もそのパッケージを使わなくなったときに外す。
- 足した advisory は `pnpm audit` の一覧に出なくなり（末尾の `ignored` 件数にだけ数えられる）、`dependabot-alert-issue` も Issue を作らない。
  外す時期は `ignored-advisories.yml` が毎週月曜に知らせる。修正版の公開か advisory の取り下げを検出すると、
  固定タイトルの Issue「Ignored audit advisories to review」を作成・更新する。通知を受けたら、修正版が依存経路から
  到達できるかを確かめて外す。「どの依存もそのパッケージを使わなくなった」はこのワークフローでは検出しないので、
  依存を外す変更のときに `pnpm why <パッケージ>` で確かめる。
- Dependabot alerts は `ignoreGhsas` を読まないので、同じ advisory を `.config/skills/shoji9x9/skills.yml` の
  `dependabot-alert-issue.dismiss` にも `ghsa` で置く。足すときと外すときは、`ignoreGhsas` と同じ変更で行う。
  `dismiss` から外しても、GitHub で却下した alert は open に戻らない。外すときは、却下した alert を GitHub で再び開く。
- `pnpm.overrides` による強制解決や、フォークへの差し替えは品質が保証されないため採らない。

現在無視している advisory は次のとおり。

| advisory                                                                 | パッケージ | 判断した Issue | 無視する理由（要約）                                                                                                    |
| ------------------------------------------------------------------------ | ---------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces`   | #147           | 上流がパッチを出さないと表明。devDependencies の markdownlint-cli2 だけが使い、渡すパターンは自前の設定とファイル名だけ |

根拠は [AGENTS.md](../AGENTS.md) の「サプライチェーン対策」と、[pnpm-workspace.yaml](../pnpm-workspace.yaml)、[ライセンス方針](../.github/license-policy.json) である。
