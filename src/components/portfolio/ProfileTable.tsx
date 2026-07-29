import type { ProfileEntry } from "@/data";

/**
 * プロフィールのキー・バリュー表。
 *
 * 表であること（見出し行を持ち、行と列の関係を辿れること）は提示方法の仕様として保つ。
 * 平坦な定義リストへ置き換えるとスクリーンリーダーでの読み上げが退行する。
 */
export function ProfileTable({ entries }: { entries: readonly ProfileEntry[] }) {
  return (
    <table className="table-fixed border border-rule">
      <thead>
        <tr>
          {/* 列見出しであることを明示する（WCAG H63）。現行は scope を持たない。 */}
          <th className="w-1/4 border border-rule p-1" scope="col">
            キー
          </th>
          <th className="w-3/4 border border-rule p-1" scope="col">
            バリュー
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className="border border-rule p-1">{entry.label}</td>
            <td className="border border-rule p-1">{entry.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
