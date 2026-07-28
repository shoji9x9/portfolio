// 論理名 → ロケータの解決（両実装で共通）。
//
// **論理名そのものが現・新をまたぐ契約**であり、期待値はゴールデンデータセットから導出する。
// ここに書く解決規則は role ＋アクセシブルネームだけを使い、id / name / class / nth-child を
// アンカーにしない。側ごとに差し替わるのは `ContainerLocators`（`types.ts`）の 4 つだけ。
//
// リスト項目だけは順序（`nth`）で引く。文言でのフィルタは「AWS」と「AWS Certified Cloud
// Practitioner」のように親子で部分一致してしまい一意にならないため。**表示順はデータセットが
// 固定した契約**なので、順序をアンカーにしても実装の内部構造には依存しない。
import type { ContainerLocators, SectionId } from "./types";
import type { Locator } from "@playwright/test";

import { allProjects, badgeByLabel, dataset } from "../dataset";
import { expectedBadgeLabel } from "../intentional-diffs";

/** 論理名とロケータの対。トレイト採取・アサーションの双方でこの順序を使う（決定論的）。 */
export type LogicalEntry = { name: string; locator: Locator };

/** `static-page` が担当するセクション（`lapras` は機能 `lapras` の担当でスコープ外）。 */
export const STATIC_PAGE_SECTIONS: readonly SectionId[] = [
  "profile",
  "account",
  "self-promotion",
  "skills",
  "careers",
  "artifacts",
  "qualifications",
  "desired-work",
];

const SECTION_HEADING_TEXT: Record<SectionId, string> = {
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

/** 資格セクションの分類名（表示順）。 */
export const QUALIFICATION_GROUPS: readonly string[] = Object.keys(
  dataset.staticContent.qualifications,
);

/** 分類名から資格項目を引く（`noUncheckedIndexedAccess` 下で undefined を潰す）。 */
export function qualificationItems(group: string): readonly string[] {
  const items = dataset.staticContent.qualifications[group];
  if (items === undefined) {
    throw new Error(`static-content.json に資格分類 "${group}" がありません`);
  }
  return items;
}

/**
 * 論理名 → ロケータの完全なカタログを組み立てる。
 * 名前の集合はデータセットから決まるので、データセットを更新すればカタログも自動で追従する。
 */
export function logicalEntries(containers: ContainerLocators): LogicalEntry[] {
  const entries: LogicalEntry[] = [];
  const add = (name: string, locator: Locator): void => {
    entries.push({ name, locator });
  };

  add("page.main", containers.main());

  for (const id of STATIC_PAGE_SECTIONS) {
    const section = containers.section(id);
    add(`section.${id}`, section);
    add(
      `section.${id}.heading`,
      section.getByRole("heading", {
        level: 2,
        name: SECTION_HEADING_TEXT[id],
        // プロフィールの見出しは装飾画像を含むため部分一致で引く（`current.ts` の注記と対）。
        exact: id !== "profile",
      }),
    );
  }

  // --- プロフィール ---
  const profile = containers.section("profile");
  add("profile.decorative-image", profile.getByRole("img", { name: "DotHiyoko", exact: true }));
  const table = profile.getByRole("table");
  add("profile.table", table);
  add("profile.column-header.key", table.getByRole("columnheader", { name: "キー", exact: true }));
  add(
    "profile.column-header.value",
    table.getByRole("columnheader", { name: "バリュー", exact: true }),
  );
  for (const entry of dataset.profile) {
    add(
      `profile.row.${entry.id}`,
      table.getByRole("row", { name: `${entry.label} ${entry.value}`, exact: true }),
    );
  }

  // --- アカウント ---
  const account = containers.section("account");
  for (const badge of dataset.badges.account) {
    const label = expectedBadgeLabel(badge);
    add(`account.link.${badge.id}`, account.getByRole("link", { name: label, exact: true }));
    add(`account.image.${badge.id}`, account.getByRole("img", { name: label, exact: true }));
  }

  // --- 自己 PR ---
  const selfPromotion = containers.section("self-promotion");
  dataset.staticContent.selfPromotion.forEach((_, index) => {
    add(`self-promotion.item.${index + 1}`, selfPromotion.getByRole("listitem").nth(index));
  });

  // --- 保有スキル ---
  const skills = containers.section("skills");
  add(
    "skills.subheading.language",
    skills.getByRole("heading", { level: 3, name: "言語", exact: true }),
  );
  add(
    "skills.subheading.framework",
    skills.getByRole("heading", {
      level: 3,
      name: "フレームワーク・ミドルウェア等",
      exact: true,
    }),
  );
  for (const badge of dataset.badges.language) {
    add(
      `skills.language.${badge.id}`,
      skills.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
    );
  }
  for (const badge of dataset.badges.framework) {
    add(
      `skills.framework.${badge.id}`,
      skills.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
    );
  }

  // --- 職務経歴詳細 ---
  const careers = containers.section("careers");
  for (const career of dataset.careers) {
    add(
      `careers.company.${career.id}`,
      careers.getByRole("heading", { level: 3, name: career.company, exact: true }),
    );
  }
  for (const { project } of allProjects) {
    const card = containers.careerProjectCard(project.id);
    add(`careers.project.${project.id}`, card);
    add(
      `careers.project.${project.id}.heading`,
      card.getByRole("heading", { level: 4, name: project.name, exact: true }),
    );
    for (const label of project.techStack.items) {
      const badge = badgeByLabel(label);
      add(
        `careers.project.${project.id}.tech.${badge.id}`,
        card.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
      );
    }
  }

  // --- 製作物 ---
  for (const artifact of dataset.artifacts) {
    const card = containers.artifactCard(artifact.id);
    add(`artifacts.card.${artifact.id}`, card);
    add(
      `artifacts.card.${artifact.id}.heading`,
      card.getByRole("heading", { level: 4, name: artifact.title, exact: true }),
    );
    add(
      `artifacts.card.${artifact.id}.url-link`,
      card.getByRole("link", { name: artifact.url, exact: true }),
    );
    add(
      `artifacts.card.${artifact.id}.repository-link`,
      card.getByRole("link", { name: artifact.repositoryUrl, exact: true }),
    );
    add(
      `artifacts.card.${artifact.id}.article-link`,
      card.getByRole("link", { name: artifact.article.title, exact: true }),
    );
    for (const label of artifact.techStack) {
      const badge = badgeByLabel(label);
      add(
        `artifacts.card.${artifact.id}.tech.${badge.id}`,
        card.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
      );
    }
  }

  // --- 資格 ---
  const qualifications = containers.section("qualifications");
  // 分類の親項目は「最も外側のリストの直下 li」で引く。文言フィルタは親子で部分一致するため使えない。
  const qualificationRoot = qualifications.getByRole("list").first();
  QUALIFICATION_GROUPS.forEach((group, groupIndex) => {
    const groupItem = qualificationRoot.locator("> li").nth(groupIndex);
    add(`qualifications.group.${groupIndex + 1}`, groupItem);
    qualificationItems(group).forEach((_, itemIndex) => {
      add(
        `qualifications.group.${groupIndex + 1}.item.${itemIndex + 1}`,
        groupItem.getByRole("listitem").nth(itemIndex),
      );
    });
  });

  // --- 希望条件 ---
  add(
    "desired-work.link",
    containers
      .section("desired-work")
      .getByRole("link", { name: dataset.staticContent.desiredWorkTitle, exact: true }),
  );

  return entries;
}
