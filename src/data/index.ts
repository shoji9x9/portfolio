// 新側の静的データの読み込み口。
//
// `src/data/generated/*.json` はゴールデンデータセットのフェーズ B（`seed/phase-b.ts`）が
// 論理データから写像して生成する。手で編集しない——編集すると再生成で失われ、現新一致の検証も
// すり抜ける。写像規則の正本は `.replace/references/static-data-semantics.md`。
import type { Artifact, Badge, BadgeGroups, Career, ProfileEntry, StaticContent } from "./types";

import artifactsJson from "./generated/artifacts.json";
import badgesJson from "./generated/badges.json";
import careersJson from "./generated/careers.json";
import profileJson from "./generated/profile.json";
import staticContentJson from "./generated/static-content.json";

export const profile: ProfileEntry[] = profileJson;
export const badges: BadgeGroups = badgesJson;
export const careers: Career[] = careersJson;
export const artifacts: Artifact[] = artifactsJson;
export const staticContent: StaticContent = staticContentJson;

/** 技術スタックが参照する安定 ID からバッジを引く。言語とフレームワークを横断して探す。 */
const techStackBadges = new Map<string, Badge>(
  [...badges.language, ...badges.framework].map((badge) => [badge.id, badge]),
);

/**
 * 安定 ID の並びをバッジの並びへ解決する。
 *
 * **解決できない ID があってもページ全体を落とさない。** 例外を投げると error boundary が無い
 * 現状ではルートごと空になり、現行（未知のキーを `undefined` として壊れた画像を 1 つ出すだけで
 * 他のセクションは表示され続ける）より可用性が落ちる。データ不整合は生成物の検証
 * （`seed/phase-b.test.ts`）とパリティスイートのバッジ件数判定で必ず捕まるので、実行時は
 * 該当バッジだけを落として警告を出す。
 */
export function resolveTechStack(ids: readonly string[]): Badge[] {
  const resolved: Badge[] = [];
  for (const id of ids) {
    const badge = techStackBadges.get(id);
    if (badge === undefined) {
      console.warn(`技術スタックのバッジ id="${id}" が badges.json にありません`);
      continue;
    }
    resolved.push(badge);
  }
  return resolved;
}

export type {
  Artifact,
  Badge,
  Career,
  ProfileEntry,
  Project,
  QualificationGroup,
  StaticContent,
} from "./types";
