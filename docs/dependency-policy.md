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

根拠は [AGENTS.md](../AGENTS.md) の「サプライチェーン対策」と、[pnpm-workspace.yaml](../pnpm-workspace.yaml)、[ライセンス方針](../.github/license-policy.json) である。
