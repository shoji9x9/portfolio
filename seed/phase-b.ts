// ゴールデンデータセット フェーズ B: 論理データ（フェーズ A）→ 新側の静的データ形式への写像。
//
// **新しいデータを作らない。** フェーズ A の論理データ（`goldenDataset`）が唯一の正本で、
// ここが行うのは表現形式の変換と、宣言済みの意図的差異の適用だけ。
// 写像規則・意味論差の正本は `.replace/references/static-data-semantics.md`。
//
// 生成先は `src/data/generated/`（設定 `dataset_static_paths` の `src/data/` 配下）。
// 手書きのスキーマ（`src/data/types.ts`）と生成物を混ぜないためサブディレクトリーに分ける。
import { goldenDataset } from "./golden-dataset";

type LogicalBadge = { id: string; label: string; href?: string; imageSrc: string };

/** 比較用に群の違い（href の有無）を吸収した形。 */
type ComparableBadge = { id: string; label: string; imageSrc: string; href?: string | undefined };

/**
 * 宣言済みの意図的差異（`intentional_diffs.may_change`「GitHub の綴りの是正（新側のみ）」）。
 * **レジストリに宣言の無い差異をここへ足さない。** 足した時点で「黙って正規化した」ことになる。
 */
const NEW_SIDE_BADGE_LABEL: Readonly<Record<string, string>> = {
  github: "GitHub",
  "github-actions": "GitHub Actions",
};

const NEW_SIDE_BADGE_IMAGE_SRC: Readonly<Record<string, string>> = {
  github:
    "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=GitHub&logoColor=white",
};

/** 資格分類の安定 ID。分類名は日本語を含み `^[a-z0-9-]+$` を機械的に導出できないため固定表で持つ。 */
const QUALIFICATION_GROUP_ID: Readonly<Record<string, string>> = {
  "情報処理推進機構 (IPA)": "ipa",
  "日本ディープラーニング協会 (JDLA)": "jdla",
  AWS: "aws",
  その他: "others",
};

function newSideLabel(badge: LogicalBadge): string {
  return NEW_SIDE_BADGE_LABEL[badge.id] ?? badge.label;
}

function newSideImageSrc(badge: LogicalBadge): string {
  return NEW_SIDE_BADGE_IMAGE_SRC[badge.id] ?? badge.imageSrc;
}

/** 表示名 → 安定 ID。技術スタックの参照表現を変える（意図的差異で表示名が動いても壊れないため）。 */
function badgeIdByLabel(label: string): string {
  const badge = [...goldenDataset.badges.language, ...goldenDataset.badges.framework].find(
    (entry) => entry.label === label,
  );
  if (badge === undefined) {
    throw new Error(`技術スタックの表示名 "${label}" に対応するバッジが論理データにありません`);
  }
  return badge.id;
}

function mapProfile() {
  return goldenDataset.profile.map((entry) => ({
    id: entry.id,
    label: entry.label,
    value: entry.value,
  }));
}

function mapBadges() {
  return {
    account: goldenDataset.badges.account.map((badge) => ({
      id: badge.id,
      label: newSideLabel(badge),
      imageSrc: newSideImageSrc(badge),
      href: badge.href,
    })),
    language: goldenDataset.badges.language.map((badge) => ({
      id: badge.id,
      label: newSideLabel(badge),
      imageSrc: newSideImageSrc(badge),
    })),
    framework: goldenDataset.badges.framework.map((badge) => ({
      id: badge.id,
      label: newSideLabel(badge),
      imageSrc: newSideImageSrc(badge),
    })),
  };
}

function mapCareers() {
  return goldenDataset.careers.map((career) => ({
    id: career.id,
    company: career.company,
    projects: career.projects.map((project) => ({
      id: project.id,
      name: project.name,
      term: project.term,
      roleTasks: project.roleTasks.map((roleTask) => ({
        summary: roleTask.summary,
        items: [...roleTask.items],
      })),
      techStack: {
        items: project.techStack.items.map(badgeIdByLabel),
        ...(project.techStack.comment === undefined ? {} : { comment: project.techStack.comment }),
      },
      members: { team: project.members.team, project: project.members.project },
    })),
  }));
}

function mapArtifacts() {
  return goldenDataset.artifacts.map((artifact) => ({
    id: artifact.id,
    title: artifact.title,
    url: artifact.url,
    repositoryUrl: artifact.repositoryUrl,
    article: { title: artifact.article.title, url: artifact.article.url },
    techStack: artifact.techStack.map(badgeIdByLabel),
  }));
}

function mapStaticContent() {
  const qualifications = Object.entries(goldenDataset.staticContent.qualifications).map(
    ([name, items]) => {
      const id = QUALIFICATION_GROUP_ID[name];
      if (id === undefined) {
        throw new Error(`資格分類 "${name}" の安定 ID が写像表にありません`);
      }
      return { id, name, items: [...items] };
    },
  );
  return {
    selfPromotion: [...goldenDataset.staticContent.selfPromotion],
    qualifications,
    desiredWork: {
      title: goldenDataset.staticContent.desiredWorkTitle,
      url: goldenDataset.staticContent.desiredWorkUrl,
    },
  };
}

function mapLapras() {
  return { publicUrl: goldenDataset.lapras.publicUrl };
}

/**
 * 新側生成物を「相対パス → 内容」の写像として組み立てる。純粋関数なのでファイルへ書かずに
 * 検証・fingerprint 算出ができる。書式（キー順・インデント・末尾改行）はフェーズ A と揃える。
 *
 * `lapras.preview` は外部 API の gap 記録なので、公開 URL だけを新側へ写像する。
 */
export function serializeNewSideDataset(): Map<string, string> {
  const entries: [string, unknown][] = [
    ["profile.json", mapProfile()],
    ["badges.json", mapBadges()],
    ["careers.json", mapCareers()],
    ["artifacts.json", mapArtifacts()],
    ["static-content.json", mapStaticContent()],
    ["lapras.json", mapLapras()],
  ];
  return new Map(entries.map(([path, value]) => [path, `${JSON.stringify(value, null, 2)}\n`]));
}

/** path 昇順に並べる（比較を順序非依存にするため）。 */
function sortByPath<T extends { path: string }>(entries: readonly T[]): T[] {
  return [...entries].toSorted((left, right) => (left.path < right.path ? -1 : 1));
}

/** 逆写像した新側と論理データを突き合わせる。差があれば両方を出して失敗させる。 */
function expectEqual(actual: unknown, expected: unknown, what: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `現新一致検証に失敗しました: ${what}\n  新側(逆写像後): ${JSON.stringify(actual)}\n  論理データ    : ${JSON.stringify(expected)}`,
    );
  }
}

/**
 * 宣言済みの意図的差異を「どの値がどう変わるか」の一覧として持つ正本。
 * `intentional_diffs.may_change`「GitHub の綴りの是正（新側のみ）」に対応する。
 * 検証はこの一覧**だけ**が差分でありうると仮定し、それ以外の差を失敗にする。
 */
export const DECLARED_DIFFS: readonly {
  path: string;
  logical: string;
  newSide: string;
}[] = [
  { path: "badges.account[github].label", logical: "Github", newSide: "GitHub" },
  {
    path: "badges.account[github].imageSrc",
    logical:
      "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=Github&logoColor=white",
    newSide:
      "https://img.shields.io/badge/shoji9x9-%2312100E.svg?&style=flat-square&logo=GitHub&logoColor=white",
  },
  {
    path: "badges.framework[github-actions].label",
    logical: "GithubActions",
    newSide: "GitHub Actions",
  },
];

/**
 * 現新一致検証。
 *
 * **逆写像で往復させない。** 前方写像と同じ表で戻すと `map∘unmap = id` になり、表に宣言外の
 * 正規化を足しても検証が通ってしまう（＝検証が何も保証しない）。代わりに、新側と論理データの
 * **差がある箇所を列挙し、それが宣言済みの一覧と完全に一致するか**を見る。
 * 宣言していない差は 1 件でもあれば失敗する。
 */
export function verifyNewSideMatchesLogical(): { checked: string[]; declaredDiffs: number } {
  const badges = mapBadges();
  const careers = mapCareers();
  const artifacts = mapArtifacts();
  const staticContent = mapStaticContent();
  const lapras = mapLapras();

  /** 新側と論理データで実際に食い違った箇所（path・両側の値）。 */
  const observed: { path: string; logical: string; newSide: string }[] = [];
  const compare = (path: string, logical: string, newSide: string): void => {
    if (logical !== newSide) observed.push({ path, logical, newSide });
  };

  // --- 表現形式の変換を戻したうえで、値そのものを 1 つずつ突き合わせる ---
  expectEqual(mapProfile(), goldenDataset.profile, "profile");

  const logicalBadges = goldenDataset.badges;
  for (const group of ["account", "language", "framework"] as const) {
    const logicalGroup: readonly ComparableBadge[] = logicalBadges[group];
    expectEqual(
      badges[group].map((badge) => badge.id),
      logicalGroup.map((badge) => badge.id),
      `badges.${group} の安定 ID と表示順`,
    );
    const newGroup: readonly ComparableBadge[] = badges[group];
    for (const [index, badge] of newGroup.entries()) {
      const logical = logicalGroup[index];
      if (logical === undefined) continue;
      compare(`badges.${group}[${badge.id}].label`, logical.label, badge.label);
      compare(`badges.${group}[${badge.id}].imageSrc`, logical.imageSrc, badge.imageSrc);
      compare(`badges.${group}[${badge.id}].href`, logical.href ?? "", badge.href ?? "");
    }
  }

  // 技術スタックは安定 ID → 表示名へ戻して比較する（表現形式の変換であり値の差ではない）。
  const labelById = new Map(
    [...goldenDataset.badges.language, ...goldenDataset.badges.framework].map((badge) => [
      badge.id,
      badge.label,
    ]),
  );
  const toLabel = (id: string): string => {
    const label = labelById.get(id);
    if (label === undefined) throw new Error(`新側の技術スタック id="${id}" を逆写像できません`);
    return label;
  };

  expectEqual(
    careers.map((career) => ({
      ...career,
      projects: career.projects.map((project) => ({
        ...project,
        techStack: {
          items: project.techStack.items.map(toLabel),
          ...("comment" in project.techStack ? { comment: project.techStack.comment } : {}),
        },
      })),
    })),
    goldenDataset.careers,
    "careers",
  );

  expectEqual(
    artifacts.map((artifact) => ({ ...artifact, techStack: artifact.techStack.map(toLabel) })),
    goldenDataset.artifacts,
    "artifacts",
  );

  // 資格分類の安定 ID は生成物のキーになるため、一意性と形式をここで検査する
  // （フェーズ A の検証対象には含まれず、逆写像では id を捨てるので他に見る場所が無い）。
  const groupIds = staticContent.qualifications.map((group) => group.id);
  if (new Set(groupIds).size !== groupIds.length) {
    throw new Error(`資格分類の安定 ID が重複しています: ${groupIds.join(", ")}`);
  }
  if (groupIds.some((id) => !/^[a-z0-9-]+$/.test(id))) {
    throw new Error(`資格分類の安定 ID の形式が不正です: ${groupIds.join(", ")}`);
  }

  expectEqual(
    {
      selfPromotion: staticContent.selfPromotion,
      qualifications: Object.fromEntries(
        staticContent.qualifications.map((group) => [group.name, group.items]),
      ),
      desiredWorkTitle: staticContent.desiredWork.title,
      desiredWorkUrl: staticContent.desiredWork.url,
    },
    goldenDataset.staticContent,
    "staticContent",
  );

  expectEqual(lapras, { publicUrl: goldenDataset.lapras.publicUrl }, "lapras");

  // --- 観測した差が宣言済みの一覧と完全に一致するか ---
  expectEqual(
    sortByPath(observed),
    sortByPath(DECLARED_DIFFS),
    "新側と論理データの差が意図的差異レジストリの宣言と一致しない（宣言していない差、または宣言したのに現れない差がある）",
  );

  return {
    checked: ["profile", "badges", "careers", "artifacts", "staticContent", "lapras"],
    declaredDiffs: DECLARED_DIFFS.length,
  };
}

/**
 * 生成・削除を許された唯一の範囲。設定 `dataset_static_paths` の `src/data/` 配下にある。
 * 手書きのスキーマ（`src/data/types.ts` / `index.ts`）を消さないようサブディレクトリーに分けている。
 */
const newSideDirectory = new URL("../src/data/generated/", import.meta.url);

function assertWithinNewSideDirectory(target: URL): void {
  if (!target.href.startsWith(newSideDirectory.href)) {
    throw new Error(`生成先が dataset_static_paths の外です: ${target.pathname}`);
  }
}

/** 削除 → 生成。冪等で、実行前の `src/data/generated/` の中身に依らず同じ結果になる。 */
async function generateNewSideDataset(): Promise<{ files: string[] }> {
  const { mkdir, rm, writeFile } = await import("node:fs/promises");
  if (!newSideDirectory.pathname.endsWith("/src/data/generated/")) {
    throw new Error(`生成先の解決結果が想定と異なります: ${newSideDirectory.pathname}`);
  }
  const files = serializeNewSideDataset();
  for (const path of files.keys()) {
    assertWithinNewSideDirectory(new URL(path, newSideDirectory));
  }

  await rm(newSideDirectory, { recursive: true, force: true });
  await mkdir(newSideDirectory, { recursive: true });
  for (const [path, content] of files) {
    await writeFile(new URL(path, newSideDirectory), content, "utf8");
  }
  return { files: [...files.keys()].toSorted() };
}

if (import.meta.main) {
  // 現新一致検証 → 生成の順に実行する（一致しない写像結果を新側へ書き出さないため）。
  const verified = verifyNewSideMatchesLogical();
  const generated = await generateNewSideDataset();
  process.stdout.write(`${JSON.stringify({ ...verified, ...generated })}\n`);
}
