import type { QualificationGroup } from "@/data";

/**
 * 資格。分類 → 資格の階層をリストの入れ子で表す（平坦化しない）。
 * 入れ子は支援技術に階層を伝えるための構造で、仕様として保つ。
 */
export function Qualifications({ groups }: { groups: readonly QualificationGroup[] }) {
  return (
    <ul className="list-inside list-disc">
      {groups.map((group) => (
        <li key={group.id}>
          {group.name}
          <ul className="list-inside list-disc pl-4">
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
