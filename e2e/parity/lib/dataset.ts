// ゴールデンデータセット（`seed/data/`）の読み込み。
//
// パリティスイートの期待値はここから引く。スイート内に値を直書きしない——直書きすると
// データセットとスイートで正本が二重化し、データセット更新時に食い違うため。
//
// import 構文ではなく `node:fs` で読むのは、生成物 JSON をランナー（Playwright / vitest / tsc）ごとの
// JSON import 仕様の差に依存させないため。読み込み時に形を検証して型を確定させる（キャストで通さない）。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dataDirectory = new URL("../../../seed/data/", import.meta.url);

export type ProfileEntry = { id: string; label: string; value: string };
export type Badge = { id: string; label: string; href?: string; imageSrc: string };
export type BadgeGroups = { account: Badge[]; language: Badge[]; framework: Badge[] };
type RoleTask = { summary: string; items: string[] };
export type Project = {
  id: string;
  name: string;
  term: string;
  roleTasks: RoleTask[];
  techStack: { items: string[]; comment?: string };
  members: { team: number; project: number };
};
export type Career = { id: string; company: string; projects: Project[] };
export type Artifact = {
  id: string;
  title: string;
  url: string;
  repositoryUrl: string;
  article: { title: string; url: string };
  techStack: string[];
};
export type StaticContent = {
  selfPromotion: string[];
  qualifications: Record<string, string[]>;
  desiredWorkTitle: string;
  desiredWorkUrl: string;
};

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(fileName, dataDirectory)), "utf8"));
}

/** 読み込んだ JSON が期待の形かを検証する。落ちたら「どのファイルの何が違うか」を出して停止する。 */
function assertShape(condition: boolean, fileName: string, detail: string): asserts condition {
  if (!condition) {
    throw new Error(`ゴールデンデータセットの形が想定と異なります: ${fileName} — ${detail}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProfileEntry(value: unknown): value is ProfileEntry {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["label"] === "string" &&
    typeof value["value"] === "string"
  );
}

function isBadge(value: unknown): value is Badge {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["label"] === "string" &&
    typeof value["imageSrc"] === "string" &&
    (value["href"] === undefined || typeof value["href"] === "string")
  );
}

function isRoleTask(value: unknown): value is RoleTask {
  return isRecord(value) && typeof value["summary"] === "string" && isStringArray(value["items"]);
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  const techStack = value["techStack"];
  const members = value["members"];
  return (
    typeof value["id"] === "string" &&
    typeof value["name"] === "string" &&
    typeof value["term"] === "string" &&
    Array.isArray(value["roleTasks"]) &&
    value["roleTasks"].every(isRoleTask) &&
    isRecord(techStack) &&
    isStringArray(techStack["items"]) &&
    (techStack["comment"] === undefined || typeof techStack["comment"] === "string") &&
    isRecord(members) &&
    typeof members["team"] === "number" &&
    typeof members["project"] === "number"
  );
}

function isCareer(value: unknown): value is Career {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["company"] === "string" &&
    Array.isArray(value["projects"]) &&
    value["projects"].every(isProject)
  );
}

function isArtifact(value: unknown): value is Artifact {
  if (!isRecord(value)) return false;
  const article = value["article"];
  return (
    typeof value["id"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["url"] === "string" &&
    typeof value["repositoryUrl"] === "string" &&
    isRecord(article) &&
    typeof article["title"] === "string" &&
    typeof article["url"] === "string" &&
    isStringArray(value["techStack"])
  );
}

function loadProfile(): ProfileEntry[] {
  const raw = readJson("profile.json");
  assertShape(Array.isArray(raw) && raw.every(isProfileEntry), "profile.json", "ProfileEntry[]");
  return raw;
}

function loadBadges(): BadgeGroups {
  const raw = readJson("badges.json");
  assertShape(isRecord(raw), "badges.json", "オブジェクトではない");
  const groups: Partial<BadgeGroups> = {};
  for (const key of ["account", "language", "framework"] as const) {
    const group = raw[key];
    assertShape(
      Array.isArray(group) && group.every(isBadge),
      "badges.json",
      `${key} が Badge[] でない`,
    );
    groups[key] = group;
  }
  const { account, language, framework } = groups;
  assertShape(
    account !== undefined && language !== undefined && framework !== undefined,
    "badges.json",
    "account / language / framework が揃っていない",
  );
  return { account, language, framework };
}

function loadCareers(): Career[] {
  const raw = readJson("careers.json");
  assertShape(Array.isArray(raw) && raw.every(isCareer), "careers.json", "Career[]");
  return raw;
}

function loadArtifacts(): Artifact[] {
  const raw = readJson("artifacts.json");
  assertShape(Array.isArray(raw) && raw.every(isArtifact), "artifacts.json", "Artifact[]");
  return raw;
}

function loadStaticContent(): StaticContent {
  const raw = readJson("static-content.json");
  assertShape(isRecord(raw), "static-content.json", "オブジェクトではない");
  const { selfPromotion, qualifications, desiredWorkTitle, desiredWorkUrl } = raw;
  assertShape(
    isStringArray(selfPromotion),
    "static-content.json",
    "selfPromotion が string[] でない",
  );
  assertShape(
    isRecord(qualifications),
    "static-content.json",
    "qualifications がオブジェクトでない",
  );
  const qualificationEntries: Record<string, string[]> = {};
  for (const [group, items] of Object.entries(qualifications)) {
    assertShape(
      isStringArray(items),
      "static-content.json",
      `qualifications.${group} が string[] でない`,
    );
    qualificationEntries[group] = items;
  }
  assertShape(
    typeof desiredWorkTitle === "string",
    "static-content.json",
    "desiredWorkTitle が string でない",
  );
  assertShape(
    typeof desiredWorkUrl === "string",
    "static-content.json",
    "desiredWorkUrl が string でない",
  );
  return {
    selfPromotion,
    qualifications: qualificationEntries,
    desiredWorkTitle,
    desiredWorkUrl,
  };
}

export const dataset = {
  profile: loadProfile(),
  badges: loadBadges(),
  careers: loadCareers(),
  artifacts: loadArtifacts(),
  staticContent: loadStaticContent(),
} as const;

/** 職務経歴を「会社をまたいだ 6 プロジェクト」として平坦化する（論理名の生成に使う）。 */
export const allProjects: { career: Career; project: Project }[] = dataset.careers.flatMap(
  (career) => career.projects.map((project) => ({ career, project })),
);

/** ラベル（= 現行の img alt）から技術スタックバッジを引く。データセット内の参照整合の検査を兼ねる。 */
export function badgeByLabel(label: string): Badge {
  const found = [...dataset.badges.language, ...dataset.badges.framework].find(
    (badge) => badge.label === label,
  );
  if (found === undefined) {
    throw new Error(`技術スタック "${label}" に対応するバッジがデータセットにありません`);
  }
  return found;
}
