// 新側（`side: new` の target）のロケータマッピング（例外のみ）。
//
// **既定は「不要」**。role ＋アクセシブルネームで引ける要素は、`portable.ts` の同じ記述が
// そのまま両実装に解決する。ここに書くのは論理名で解決できない例外だけ——本機能では
// `ContainerLocators` の 4 つだけが該当する。
//
// 現側（`current.ts`）はセクションもカードも role を持たない素の `div` のため、
// 「main 直下の div を見出しでフィルタする」という DOM 構造依存の解決が必要だった。
// 新側はセクションを `section` ＋ `aria-labelledby`（role=region）、カードを `article` ＋
// `aria-labelledby`（role=article）で表しているため、**構造ではなく role ＋アクセシブルネームで
// 引ける**。現側の脆弱マッピングは新側では不要になった（`porting.md` に記録）。
import type { ContainerLocators, SectionId } from "./types";
import type { Locator, Page } from "@playwright/test";

import { artifactTitle, projectName, sectionNameOptions } from "./names";

export function newContainers(page: Page): ContainerLocators {
  return {
    main: (): Locator => page.getByRole("main"),

    section: (id: SectionId): Locator => page.getByRole("region", sectionNameOptions(id)),

    careerProjectCard: (projectId: string): Locator =>
      page.getByRole("article", { name: projectName(projectId), exact: true }),

    artifactCard: (artifactId: string): Locator =>
      page.getByRole("article", { name: artifactTitle(artifactId), exact: true }),
  };
}
