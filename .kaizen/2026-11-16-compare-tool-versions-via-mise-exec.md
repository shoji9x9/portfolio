---
date: 2026-11-16
type: doc
priority: medium
status: pending
applied-to: []
session: claude-code
---

# ツールの旧版との比較は mise exec <tool>@<ver> で起動し、インストール先のパスを手で組まない

## 事象

Issue #208 で viteplus 1.4.0→1.5.0 の lint 失敗を切り分けるとき、
`PATH=~/.local/share/mise/installs/viteplus/<ver>/bin:$PATH vp lint` で旧版と新版を比べた。
1.5.0 の install には `bin/` が無く（`node_modules/.bin/` 形式）、存在しない PATH 要素は
黙って無視されて別の vp が起動した。両版とも「oxlint 1.89.0・rc=0」と出て、
「1.5.0 でも通る」という誤った陰性結果になりかけた。
加えて `cmd | tail` の `$?` は tail の終了コードで、rc=0 が vp の結果ではなかった。

## 根本原因

- なぜ別のバイナリーが動いたか: 存在しないディレクトリーを PATH に足しても失敗せず、
  後ろの shim に解決される。
- なぜパスが存在しなかったか: installs/ の配置はツールの版ではなく、インストールした時点の
  mise の npm バックエンドで決まる（古い install は bin/、新しい install は aube 形式の
  node_modules/.bin/）。配置を一定だと仮定した。
- なぜ仮定したか（根本原因）: mise 自身の版選択（`mise exec viteplus@1.4.0 -- vp`、
  `mise which vp --tool viteplus@1.4.0`）を使わず、内部配置に依存した。AGENTS.md「調査と実験」には
  隔離・操作成立の規律はあるが、「ツールの版を切り替えて比べる」ときの起動方法が無い。

横断確認: リポジトリー内に installs/ を直書きしたスクリプト・ドキュメントは無い（grep 済み）。

## 提案

ツールの版を切り替えて挙動を比べるときは `mise exec <tool>@<ver> -- <cmd>` で起動し、起動直後に版を出力させて条件の成立を確かめる（mise の installs/ 配下のパスは手で組まない）。

- 反映先: AGENTS.md「調査と実験」の隔離の項に 1 項目追加する。
- 併記: 結果判定に使う終了コードはパイプの末尾ではなく対象コマンドのもの
  （`${PIPESTATUS[0]}` か、出力をファイルへ落としてから `$?`）を見る。
