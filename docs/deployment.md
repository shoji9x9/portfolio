# Cloudflare Pages デプロイ

このリポジトリは Cloudflare Pages に静的サイトをデプロイする。PR ではプレビュー、
`main` へのマージ後は production をデプロイする。ローカル開発では Cloudflare へ
デプロイせず、`pnpm dev` を使う。
`pnpm dev` はViteの開発用アダプターで `GET /api/lapras-preview` も提供し、Pages Functionと同じ
取得・検証・キャッシュ中核を呼ぶ。Cloudflareランタイム固有の最終確認はPreviewスモークで行う。

## 初回設定

Cloudflare Pages は Git 連携ではなく、GitHub Actions からビルド成果物を直接アップロードする。
以下はローカルの CLI で実行する。

1. OAuth で Wrangler にログインする。WSL では IPv4 loopback を使い、資格情報は平文ファイルでは
   なく OS keyring に保存する。Linux の keyring には `libsecret-tools` と `gnome-keyring` が
   必要である。

   ```bash
   sudo apt-get install libsecret-tools gnome-keyring
   ```

   Wrangler 4.114.0 は Debian の `secret-tool --version` が終了コード 2 を返すことを未導入として
   誤判定する。このバージョンを利用する間は、`--version` にだけ成功を返し、他の呼び出しを
   `/usr/bin/secret-tool` へ委譲する互換ラッパーを置く。

   ```bash
   install -d "$HOME/.local/bin"
   cat >"$HOME/.local/bin/secret-tool" <<'EOF'
   #!/bin/sh
   # Wrangler 4.114.0 は Debian の `secret-tool --version` の終了コード 2 を、
   # 未導入として誤判定する。このラッパーはその検出だけを補正し、実際の認証情報操作は
   # すべて /usr/bin/secret-tool へ委譲する。Wrangler 更新後に直接実行できれば削除する。
   if [ "$#" -eq 1 ] && [ "$1" = "--version" ]; then
     printf '%s\n' 'secret-tool'
     exit 0
   fi
   exec /usr/bin/secret-tool "$@"
   EOF
   chmod 755 "$HOME/.local/bin/secret-tool"

   CLOUDFLARE_AUTH_USE_KEYRING=true mise exec -- wrangler login --browser=false \
     --callback-host 127.0.0.1 \
     --callback-port 8976 \
     --use-keyring
   ```

   ブラウザーで承認後、ターミナルが完了しない場合は、ブラウザーのアドレスバーにある
   `http://localhost:8976/oauth/callback?...` をコピーして、別の WSL ターミナルでその URL を
   `curl` する。この場合も OAuth callback は WSL 内の loopback listener にだけ届く。

   ```bash
   read -rsp 'Callback URL: ' callback_url; echo
   curl "$callback_url"
   unset callback_url
   ```

   OAuth credential はローカルに保持されるが、`--use-keyring` により keyring の鍵で暗号化された
   ファイルとして保存される。`CLOUDFLARE_AUTH_USE_KEYRING=true` は keyring が使えない場合の
   平文保存へのフォールバックを禁止する。以後の Wrangler コマンドにもこの環境変数を付ける。

2. Pages プロジェクト `shoji9x9` の production branch を `main` として作成する。
   production domain は <https://shoji9x9.pages.dev/> になる。

   ```bash
   CLOUDFLARE_AUTH_USE_KEYRING=true \
     mise exec -- wrangler pages project create shoji9x9 --production-branch main
   ```

   プロジェクト作成だけでは production を公開しない。最初の `main` デプロイ前は、
   production URL に `Nothing is here yet` または 404 が表示される。PR preview は production URL
   ではなく、PR ブランチに対応する別の Cloudflare Pages URL で公開される。

3. Cloudflare Dashboard の [API Tokens](https://dash.cloudflare.com/profile/api-tokens) で、
   `github-actions-portfolio-pages-deploy` という名前の API Token を作成する。対象アカウントを
   選び、**Account / Cloudflare Pages / Edit** だけを許可する。`Read` は別途追加しない。
   グローバル API Key は使わない。preview と production は同じ account・権限を使うため、Token と
   account ID は repository-level GitHub Actions secret として一度だけ登録する。値はプロンプト入力し、
   シェル履歴・標準出力へ残さない。

   ```bash
   read -rsp 'Cloudflare API Token: ' CLOUDFLARE_API_TOKEN; echo
   read -rp 'Cloudflare Account ID: ' CLOUDFLARE_ACCOUNT_ID

   printf '%s' "$CLOUDFLARE_API_TOKEN" |
     gh secret set CLOUDFLARE_API_TOKEN --repo shoji9x9/portfolio
   printf '%s' "$CLOUDFLARE_ACCOUNT_ID" |
     gh secret set CLOUDFLARE_ACCOUNT_ID --repo shoji9x9/portfolio

   ```

4. GitHub Secrets 登録に使った一時環境変数を破棄する。

   ```bash
   unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
   ```

## デプロイフロー

- PR の作成・更新: repository secret で `pages deploy --branch <PR ブランチ>` を実行し、PR ブランチに
  対応する Cloudflare Pages preview deployment を更新する。repository owner が作成した同一リポジトリ
  内 PR だけが対象であり、外部 fork・Dependabot・collaborator の PR では secret を安全に渡せないため
  preview deploy を実行しない。デプロイ後は発行された deployment 固有 URL に対して Preview スモーク
  テストを実行し、実 Pages Function・LAPRAS 公開ページ・ブラウザー上の画像表示まで成功した場合だけ
  `Deploy / Preview` を成功とする。
  **配信するのは PR ブランチの先頭コミット**である（checkout に `ref: github.event.pull_request.head.sha`
  を指定）。`actions/checkout` の既定は `refs/pull/<n>/merge`、つまり PR を `main` へ試験マージした一時
  コミットで、それを配信すると preview の中身が「ブランチのコード」ではなく「マージ結果」になる。
  parity 検証では差分の原因をブランチの実装と `main` の変更に切り分けられなくなるため、ブランチ先頭を明示する。
- `main`: repository secret で `pages deploy --branch main` を実行し、Cloudflare Pages の production を
  更新する。

### Preview URL

Cloudflare Pages は preview deploy ごとに deployment 固有 URL
（`https://<hash>.<project-domain>.pages.dev/`）を発行する。この hash は deploy のたびに変わる。
同時に PR ブランチ名に対応する branch alias が作られ、常にそのブランチの最新 deployment を指す。
これは設定項目ではなく、`pages deploy --branch <PR ブランチ>` が自動生成する。branch 名は小文字化・
記号の置換・長さの切り詰めが行われるため、URL を組み立てずに
[Cloudflare の preview aliases](https://developers.cloudflare.com/pages/configuration/preview-deployments/#preview-aliases)
に従って Dashboard の表示値をコピーする。

parity 系スキルと `browser-test` は、`preview` を `targets` の 1 環境として `--target preview` で選べる。
URL は固定値ではなく、`skills.yml` の `url_command`（`node scripts/preview-url.mjs`）が実行時に解決する。
このスクリプトは **branch alias ではなく deployment 固有 URL を返す**。alias は「そのブランチの最新」を
指すため検証の途中で別の deployment へ切り替わりうるのに対し、deployment 固有 URL は特定のビルドに
固定されるためである。

スクリプトは次の場合に URL を返さず停止する（`url_command` は失敗で呼び出し側スキルを止める契約）。

| 停止条件                                                  | 理由                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 現ブランチの preview deployment が無い                    | preview は PR 作成時にのみデプロイされる。PR 作成前は解決できない                         |
| 最新 deployment が未完了・失敗（`Active` / `Failure` 等） | エラーページや未完成のビルドを「新側」として比較させない                                  |
| deployment のコミットが手元の HEAD と異なる               | push 前のコミットがある、またはデプロイ未完了。古いビルドを現在のコードとして検証させない |

実装中は `pnpm dev` を起動し、<http://localhost:5173/> を browser-test スキルへ
`--env local` を指定して確認する。これはシェルコマンドではない。production-like の確認には、
`pnpm start`（build 後に Vite preview を起動）と、browser-test スキルの `--env local-production` を
使う。Cloudflare の preview は、ローカルでは確認できないデプロイ後の最終確認に使う。
