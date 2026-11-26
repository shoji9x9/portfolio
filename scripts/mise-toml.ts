/**
 * `mise.toml` の読み取り（純ロジック）。整合検査スクリプトが共有する。
 *
 * TOML パーサーは導入せず行走査で解く（依存を増やさないため）。`[tools]` 以外のテーブル
 * （`[settings]` など）の同名キーを拾わないよう、現在のテーブル名を追跡する。
 */

/** 正規表現のメタ文字をエスケープする（ツール名に `:` や `.` を含むため）。 */
function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * `mise.toml` の `[tools]` テーブルから、`tool` の固定バージョン（文字列値）を取り出す。
 *
 * 裸のキー（`node = "..."`）と引用符付きキー（`"npm:typescript-language-server" = "..."`）の
 * どちらも読む。`wrangler = { version = "..." }` のようなインラインテーブルは対象外で
 * undefined を返す（呼び出し側が「見つからない」と報告する）。
 */
export function extractMiseToolPin(miseToml: string, tool: string): string | undefined {
  const escaped = escapeRegExp(tool);
  // 値は基本文字列（"..."）とリテラル文字列（'...'）のどちらも受ける。
  const pinPattern = new RegExp(
    String.raw`^(?:${escaped}|"${escaped}")\s*=\s*(?:"([^"]+)"|'([^']+)')`,
  );
  let table = "";

  for (const rawLine of miseToml.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    if (line.startsWith("[")) {
      // 表 / 配列表のヘッダー行。末尾コメント付き（`[settings] # ...`）も表名として読む。
      // 認識できない形（`[[foo]]` など）は「直前の表の続き」とは見なさず表名を捨てる。
      // 続きと見なすと、別の表の同名キーを [tools] の値として誤読してしまう。
      const tableMatch = /^\[([^\]]+)]\s*(?:#.*)?$/.exec(line);
      table = tableMatch?.[1] ?? "";
      continue;
    }

    if (table !== "tools") continue;

    const pinMatch = pinPattern.exec(line);
    const pin = pinMatch?.[1] ?? pinMatch?.[2];
    if (pin !== undefined) return pin;
  }

  return undefined;
}
