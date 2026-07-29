// セクション・カードのアクセシブルネーム解決（現側・新側・論理名カタログで共有）。
//
// 側ごとに違うのは「何で引くか」（現側は DOM 構造、新側は role）であって、**引くための名前は同じ**。
// 名前まで側ごとに持つと、データセットを更新したときに片側だけ古くなる。
import type { SectionId } from "./types";

import { allProjects, dataset } from "../dataset";

/** セクション見出し（h2）の文言。セクションのアクセシブルネームでもある。 */
export const SECTION_HEADING_TEXT: Record<SectionId, string> = {
  profile: "プロフィール",
  account: "アカウント",
  "self-promotion": "自己PR",
  skills: "保有スキル",
  careers: "職務経歴詳細",
  artifacts: "製作物",
  qualifications: "資格",
  "desired-work": "希望条件",
  lapras: "LAPRAS",
};

/**
 * 完全一致で引けないセクション。
 * `プロフィール` の見出しはインライン装飾画像（alt="DotHiyoko"）を含むため、アクセシブルネームが
 * "プロフィールDotHiyoko" になる。見出しに装飾画像を含めるかは実装の裁量なので、完全一致を契約にしない。
 */
const INEXACT_SECTION_NAME: ReadonlySet<SectionId> = new Set<SectionId>(["profile"]);

/** セクション ID から `getByRole` に渡す name / exact を組み立てる。 */
export function sectionNameOptions(id: SectionId): { name: string; exact: boolean } {
  return { name: SECTION_HEADING_TEXT[id], exact: !INEXACT_SECTION_NAME.has(id) };
}

/** カード見出しの文言はデータセットが正本。ロケータ側で直書きしない。 */
export function projectName(projectId: string): string {
  const found = allProjects.find((entry) => entry.project.id === projectId);
  if (found === undefined) {
    throw new Error(`careers.json に project.id="${projectId}" がありません`);
  }
  return found.project.name;
}

export function artifactTitle(artifactId: string): string {
  const found = dataset.artifacts.find((artifact) => artifact.id === artifactId);
  if (found === undefined) {
    throw new Error(`artifacts.json に artifact.id="${artifactId}" がありません`);
  }
  return found.title;
}
