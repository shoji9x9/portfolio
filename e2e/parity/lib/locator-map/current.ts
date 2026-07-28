// 現側（`current-prod` = 現行 GitHub Pages）のロケータマッピング。
//
// **脆弱なマッピングの記録**（`parity-replace` の porting 判断材料）:
// 現行の `/` は `<main>` の直下に `div.mb-8` を 9 個並べただけの構造で、セクションにもカードにも
// role・landmark・アクセシブルネームが無い。そのため以下 3 種のコンテナー解決は DOM 構造
// （直下の `div` の入れ子）に依存する。**新側がセクションを `<section>`＋見出し関連付け（role=region）、
// カードを `<article>` 等で表現すれば、新側で書く例外はこの 3 種だけで済み、内側の要素は
// `portable.ts` がそのまま両実装に解決する。**
//
// 構造への依存は「直下の div の並び」までに留め、nth-child の番号には依存させない
// （見出しでフィルタするため、セクションの追加・並べ替えで壊れない）。
import type { ContainerLocators, SectionId } from "./types";
import type { Locator, Page } from "@playwright/test";

import { allProjects, dataset } from "../dataset";

/** セクション見出し（h2）のアクセシブルネーム。 */
const SECTION_HEADING: Record<SectionId, string> = {
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
 * `プロフィール` の見出しはインライン画像（alt="DotHiyoko"）を子に持つため、
 * アクセシブルネームが "プロフィールDotHiyoko" になる。ここだけ部分一致で引く。
 * 見出しに装飾画像を含めるかは新側の裁量なので、完全一致を契約にしない。
 */
const INEXACT_HEADING: ReadonlySet<SectionId> = new Set<SectionId>(["profile"]);

/** カード見出しの文言はデータセットが正本。ロケータ側で直書きしない。 */
function projectName(projectId: string): string {
  const found = allProjects.find((entry) => entry.project.id === projectId);
  if (found === undefined) {
    throw new Error(`careers.json に project.id="${projectId}" がありません`);
  }
  return found.project.name;
}

function artifactTitle(artifactId: string): string {
  const found = dataset.artifacts.find((artifact) => artifact.id === artifactId);
  if (found === undefined) {
    throw new Error(`artifacts.json に artifact.id="${artifactId}" がありません`);
  }
  return found.title;
}

export function currentContainers(page: Page): ContainerLocators {
  const main = (): Locator => page.getByRole("main");

  const section = (id: SectionId): Locator =>
    main()
      // 例外: セクションが role を持たないため「main 直下の div」で絞る。
      .locator("> div")
      .filter({
        has: page.getByRole("heading", {
          level: 2,
          name: SECTION_HEADING[id],
          exact: !INEXACT_HEADING.has(id),
        }),
      });

  const careerProjectCard = (projectId: string): Locator =>
    section("careers")
      // 例外: セクション > 会社ブロック > カード並びラッパー > カード、という素の div 4 階層。
      .locator("> div > div > div")
      .filter({
        has: page.getByRole("heading", { level: 4, name: projectName(projectId), exact: true }),
      });

  const artifactCard = (artifactId: string): Locator =>
    section("artifacts")
      // 例外: セクション > カード並びラッパー > カード、という素の div 3 階層。
      .locator("> div > div")
      .filter({
        has: page.getByRole("heading", { level: 4, name: artifactTitle(artifactId), exact: true }),
      });

  return { main, section, careerProjectCard, artifactCard };
}
