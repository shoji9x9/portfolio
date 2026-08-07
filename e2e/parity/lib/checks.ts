// パリティ判定の本体（手書き assertion）。
//
// スペックからも**強度ゲート（故障注入）からも同じ関数を呼ぶ**ため、判定をここへ集約している。
// 強度は「手書き assertion 単体」ではなく「手書き assertion ＋ ベースライン ＋ 差分器」で測るが、
// その手書き assertion 側は**スイートが実際に使うものと同一でなければ**ゲートの意味がない
// （ゲート専用の別実装を置くと、素通りしたかどうかを測れなくなる）。
import type { Badge } from "./dataset";
import type { ContainerLocators } from "./locator-map/types";
import type { Locator, Page } from "@playwright/test";

import { expect } from "@playwright/test";

import { allProjects, badgeByLabel, dataset } from "./dataset";
import { expectedBadgeImageSrc, expectedBadgeLabel } from "./intentional-diffs";
import { enterState, tabThrough } from "./interactions";
import { sectionNameOptions } from "./locator-map/names";
import {
  QUALIFICATION_GROUPS,
  qualificationItems,
  STATIC_PAGE_SECTIONS,
} from "./locator-map/portable";

/** 表示順の契約: ロケータ列のアクセシブルネームが期待列と一致すること。 */
async function expectAccessibleNamesInOrder(
  locator: Locator,
  expected: readonly string[],
): Promise<void> {
  await expect(locator).toHaveCount(expected.length);
  const elements = await locator.all();
  for (const [index, name] of expected.entries()) {
    const element = elements[index];
    if (element === undefined) {
      throw new Error(`${index} 番目の要素が取得できませんでした（期待: ${name}）`);
    }
    await expect(element).toHaveAccessibleName(name);
  }
}

/** 安定 ID からバッジを引き、その side で期待する表示名を返す（手書き aria スナップショット用）。 */
function badgeLabelById(group: readonly Badge[], id: string): string {
  const badge = group.find((entry) => entry.id === id);
  if (badge === undefined) {
    throw new Error(`バッジ id="${id}" がデータセットにありません`);
  }
  return expectedBadgeLabel(badge);
}

/** 指定プロパティの computed 値を読む。 */
async function computed(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (element, prop) => getComputedStyle(element).getPropertyValue(prop),
    property,
  );
}

// ---------------------------------------------------------------------------
// 表示パリティ（データ・文言・順序・リンク先）
// ---------------------------------------------------------------------------

export async function checkPageBasicsAndSectionOrder(
  page: Page,
  containers: ContainerLocators,
): Promise<void> {
  await expect(page).toHaveTitle("Portfolio/shoji9x9");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");

  // セクション見出し（h2）が仕様の順で並ぶこと。
  //
  // **他機能のセクションを判定に含めない。** 同じページに機能 `lapras`（Issue #23）の
  // LAPRAS セクションが同居するが、それを要求すると `static-page` を単独で green にできなくなり、
  // 機能ごとに作り切る前提が崩れる。そこで期待列から LAPRAS だけを外し、**判定の強さは落とさない**
  // ——アクセシブルネームで引き、プロフィール以外は完全一致のままにする（文言を変えたら赤くなる）。
  // 他機能の見出しが増えても赤くならないよう、`static-page` のセクションだけを抜き出して順序を見る。
  const ownSections = STATIC_PAGE_SECTIONS.map((id) => sectionNameOptions(id));
  const headings = await containers.main().getByRole("heading", { level: 2 }).all();
  const matched: string[] = [];
  for (const heading of headings) {
    const name = (await heading.getAttribute("aria-label")) ?? (await heading.innerText());
    const normalized = name.replaceAll(/\s+/g, "");
    const own = ownSections.find((section) =>
      section.exact ? normalized === section.name : normalized.startsWith(section.name),
    );
    if (own !== undefined) matched.push(own.name);
  }
  expect(matched, "static-page のセクション見出しが仕様の順で並んでいない").toEqual(
    ownSections.map((section) => section.name),
  );

  for (const id of STATIC_PAGE_SECTIONS) {
    await expect(containers.section(id), `セクション ${id} が一意に解決しない`).toHaveCount(1);
  }
}

export async function checkProfileTable(containers: ContainerLocators): Promise<void> {
  const table = containers.section("profile").getByRole("table");
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(dataset.profile.length + 1);
  await expect(rows.nth(0).getByRole("columnheader")).toHaveText(["キー", "バリュー"]);

  for (const [index, entry] of dataset.profile.entries()) {
    await expect(rows.nth(index + 1).getByRole("cell")).toHaveText([entry.label, entry.value]);
  }
}

export async function checkAccountBadges(containers: ContainerLocators): Promise<void> {
  const account = containers.section("account");
  await expectAccessibleNamesInOrder(
    account.getByRole("link"),
    dataset.badges.account.map((badge) => expectedBadgeLabel(badge)),
  );

  for (const badge of dataset.badges.account) {
    const link = account.getByRole("link", { name: expectedBadgeLabel(badge), exact: true });
    await expect(link).toHaveAttribute("href", badge.href ?? "");
    await expect(link.getByRole("img")).toHaveAttribute("src", expectedBadgeImageSrc(badge));
  }
}

export async function checkSelfPromotion(containers: ContainerLocators): Promise<void> {
  await expect(containers.section("self-promotion").getByRole("listitem")).toHaveText(
    dataset.staticContent.selfPromotion,
  );
}

export async function checkSkillBadges(containers: ContainerLocators): Promise<void> {
  const skills = containers.section("skills");
  await expect(skills.getByRole("heading", { level: 3 })).toHaveText([
    "言語",
    "フレームワーク・ミドルウェア等",
  ]);

  await expectAccessibleNamesInOrder(skills.getByRole("img"), [
    ...dataset.badges.language.map((badge) => expectedBadgeLabel(badge)),
    ...dataset.badges.framework.map((badge) => expectedBadgeLabel(badge)),
  ]);

  for (const badge of [...dataset.badges.language, ...dataset.badges.framework]) {
    await expect(
      skills.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
    ).toHaveAttribute("src", expectedBadgeImageSrc(badge));
  }
}

export async function checkCareerOrder(containers: ContainerLocators): Promise<void> {
  const careers = containers.section("careers");
  await expect(careers.getByRole("heading", { level: 3 })).toHaveText(
    dataset.careers.map((career) => career.company),
  );
  await expect(careers.getByRole("heading", { level: 4 })).toHaveText(
    allProjects.map(({ project }) => project.name),
  );
}

export async function checkCareerProject(
  containers: ContainerLocators,
  projectId: string,
): Promise<void> {
  const found = allProjects.find((entry) => entry.project.id === projectId);
  if (found === undefined) throw new Error(`未知の project.id: ${projectId}`);
  const { project } = found;
  const card = containers.careerProjectCard(project.id);
  await expect(card, "プロジェクトカードが一意に解決しない").toHaveCount(1);

  await expect(card.getByRole("heading", { level: 5 })).toHaveText([
    "期間",
    "ロールとタスク",
    "メンバー数",
    "技術スタック",
  ]);

  await expect(card).toContainText(project.term);
  await expect(card).toContainText(
    `チーム: ${project.members.team}名 プロジェクト全体: ${project.members.project}名`,
  );

  for (const roleTask of project.roleTasks) {
    await expect(card).toContainText(roleTask.summary);
  }
  await expect(card.getByRole("listitem")).toHaveText(
    project.roleTasks.flatMap((roleTask) => roleTask.items),
  );

  const badges = project.techStack.items.map((label) => badgeByLabel(label));
  await expectAccessibleNamesInOrder(
    card.getByRole("img"),
    badges.map((badge) => expectedBadgeLabel(badge)),
  );
  for (const badge of badges) {
    await expect(
      card.getByRole("img", { name: expectedBadgeLabel(badge), exact: true }),
    ).toHaveAttribute("src", expectedBadgeImageSrc(badge));
  }

  if (project.techStack.comment !== undefined) {
    await expect(card).toContainText(project.techStack.comment);
  }
}

export async function checkArtifactOrder(containers: ContainerLocators): Promise<void> {
  await expect(containers.section("artifacts").getByRole("heading", { level: 4 })).toHaveText(
    dataset.artifacts.map((artifact) => artifact.title),
  );
}

export async function checkArtifactCard(
  containers: ContainerLocators,
  artifactId: string,
): Promise<void> {
  const artifact = dataset.artifacts.find((entry) => entry.id === artifactId);
  if (artifact === undefined) throw new Error(`未知の artifact.id: ${artifactId}`);
  const card = containers.artifactCard(artifact.id);
  await expect(card, "製作物カードが一意に解決しない").toHaveCount(1);

  // 記事を持たない製作物は「記事」見出しごと出ない。見出しの並びを期待値にすることで
  // 「見出しだけ残ってリンクが無い」状態も落ちる。
  await expect(card.getByRole("heading", { level: 5 })).toHaveText([
    "URL",
    "リポジトリー",
    "技術スタック",
    ...(artifact.article === undefined ? [] : ["記事"]),
  ]);

  // リンクは「表示文言」と「リンク先」の両方が仕様。
  await expectAccessibleNamesInOrder(card.getByRole("link"), [
    artifact.url,
    artifact.repositoryUrl,
    ...(artifact.article === undefined ? [] : [artifact.article.title]),
  ]);
  await expect(card.getByRole("link", { name: artifact.url, exact: true })).toHaveAttribute(
    "href",
    artifact.url,
  );
  await expect(
    card.getByRole("link", { name: artifact.repositoryUrl, exact: true }),
  ).toHaveAttribute("href", artifact.repositoryUrl);
  if (artifact.article !== undefined) {
    await expect(
      card.getByRole("link", { name: artifact.article.title, exact: true }),
    ).toHaveAttribute("href", artifact.article.url);
  }

  const badges = artifact.techStack.map((label) => badgeByLabel(label));
  await expectAccessibleNamesInOrder(
    card.getByRole("img"),
    badges.map((badge) => expectedBadgeLabel(badge)),
  );
}

export async function checkQualifications(containers: ContainerLocators): Promise<void> {
  const root = containers.section("qualifications").getByRole("list").first();
  const groups = root.locator("> li");
  await expect(groups).toHaveCount(QUALIFICATION_GROUPS.length);

  for (const [index, group] of QUALIFICATION_GROUPS.entries()) {
    const groupItem = groups.nth(index);
    await expect(groupItem).toContainText(group);
    await expect(groupItem.getByRole("listitem")).toHaveText([...qualificationItems(group)]);
  }
}

export async function checkDesiredWork(containers: ContainerLocators): Promise<void> {
  const link = containers.section("desired-work").getByRole("link");
  await expect(link).toHaveCount(1);
  await expect(link).toHaveText(dataset.staticContent.desiredWorkTitle);
  await expect(link).toHaveAttribute("href", dataset.staticContent.desiredWorkUrl);
}

export async function checkExternalImagesRendered(containers: ContainerLocators): Promise<void> {
  // 現行の副作用出力は Shields.io / AtCoder への画像 GET のみ。応答バイナリは正解に固定せず、
  // 「参照 URL のとおりに取得でき、実寸を持って描画される」ことを検証対象にする。
  for (const section of [
    containers.section("account"),
    containers.section("skills"),
    containers.section("careers"),
    containers.section("artifacts"),
  ]) {
    const broken = await section.getByRole("img").evaluateAll((elements) =>
      elements
        .filter((element): element is HTMLImageElement => element instanceof HTMLImageElement)
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    );
    expect(broken, "描画に失敗した外部画像がある").toEqual([]);
  }
}

/**
 * 日本語がブラウザーの既定フォントへ落ちること。
 *
 * 現行のフォントスタックは `Inter, Inter Fallback` の 2 つだけで、**総称ファミリーを持たない**。
 * どちらも日本語グリフを持たないため、日本語はブラウザーの既定フォントで描画される。
 * ここに `system-ui` や `sans-serif` を混ぜると、日本語グリフを持つファミリー（Windows なら
 * Yu Gothic UI）で止まり、現行と別のフォントで日本語が描画される。
 *
 * **この差は環境をまたがないと表面化しない。** Linux では総称ファミリーの解決先が既定フォントと
 * 同じになり幅が一致してしまうため、実測では気づけない。そのため「スタックに日本語グリフを持ちうる
 * 指定を入れない」という形で決定論的に判定する。
 */
export async function checkFontStackFallsThroughForCjk(page: Page): Promise<void> {
  const stack = await page
    .locator("body")
    .evaluate((element) => getComputedStyle(element).fontFamily);
  const families = stack.split(",").map((name) => name.trim().replaceAll(/^["']|["']$/g, ""));

  // 総称ファミリーとシステムフォントのキーワード。いずれも日本語環境で CJK 対応フォントに解決される。
  const cjkCapable = [
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
    "ui-rounded",
    "-apple-system",
    "BlinkMacSystemFont",
  ];
  const found = families.filter((name) => cjkCapable.includes(name));
  expect(
    found,
    `フォントスタックに日本語グリフを持ちうる指定が入っている（現行は総称ファミリーを持たない）: ${stack}`,
  ).toEqual([]);
}

/**
 * favicon（ブラウザーのタブに出るアイコン）。
 *
 * ページ本文には現れないが利用者に見える要素なので、宣言（`rel="icon"` の href / type / sizes）と
 * **実際に配信されているバイト列**の両方を判定する。宣言だけだと 404 や別画像に差し替わっても通る。
 */
export async function checkFavicon(page: Page): Promise<void> {
  const icon = page.locator('link[rel="icon"]');
  await expect(icon, "rel=icon の宣言が 1 つでない").toHaveCount(1);
  await expect(icon).toHaveAttribute("href", "/favicon.ico");
  await expect(icon).toHaveAttribute("type", "image/x-icon");
  await expect(icon).toHaveAttribute("sizes", "32x32");

  const response = await page.request.get("/favicon.ico");
  expect(response.status(), "favicon.ico が配信されていない").toBe(200);
  const body = await response.body();
  // 現行が配信している ICO（32x32・1 画像）と同じ内容であること。サイズと ICO ヘッダーで確かめる。
  expect(body.byteLength, "favicon.ico のサイズが現行と違う").toBe(4286);
  expect(body.readUInt16LE(4), "ICO に含まれる画像数が違う").toBe(1);
  expect([body[6], body[7]], "favicon の寸法が 32x32 でない").toEqual([32, 32]);
}

// ---------------------------------------------------------------------------
// 構造パリティ（手書きの寛容な aria スナップショット）
// ---------------------------------------------------------------------------

export async function checkAriaProfile(containers: ContainerLocators): Promise<void> {
  await expect(containers.section("profile")).toMatchAriaSnapshot(`
    - heading /プロフィール/ [level=2]
    - table:
      - rowgroup:
        - row:
          - columnheader "キー"
          - columnheader "バリュー"
      - rowgroup:
        - row:
          - cell "職業"
          - cell
        - row:
          - cell "居住地"
          - cell
        - row:
          - cell "生まれ"
          - cell
        - row:
          - cell "最終学歴"
          - cell
  `);
}

export async function checkAriaAccount(containers: ContainerLocators): Promise<void> {
  // GitHub の綴りは意図的差異として宣言済み（新側のみ是正）。side ごとの期待値を差し込む。
  const github = badgeLabelById(dataset.badges.account, "github");
  await expect(containers.section("account")).toMatchAriaSnapshot(`
    - heading "アカウント" [level=2]
    - link "${github}":
      - /url: https://github.com/shoji9x9
      - img "${github}"
    - link "Twitter":
      - /url: https://twitter.com/shoji9x9
      - img "Twitter"
    - link "Qiita":
      - /url: https://qiita.com/shoji9x9
      - img "Qiita"
    - link "Zenn":
      - /url: https://zenn.dev/shoji9x9
      - img "Zenn"
    - link "AtCoder":
      - /url: https://atcoder.jp/users/shoji9x9
      - img "AtCoder"
  `);
}

export async function checkAriaSelfPromotion(containers: ContainerLocators): Promise<void> {
  await expect(containers.section("self-promotion")).toMatchAriaSnapshot(`
    - heading "自己PR" [level=2]
    - list:
      - listitem
      - listitem
      - listitem
      - listitem
  `);
}

export async function checkAriaSkills(containers: ContainerLocators): Promise<void> {
  const githubActions = badgeLabelById(dataset.badges.framework, "github-actions");
  await expect(containers.section("skills")).toMatchAriaSnapshot(`
    - heading "保有スキル" [level=2]
    - heading "言語" [level=3]
    - img "JavaScript"
    - img "COBOL"
    - heading "フレームワーク・ミドルウェア等" [level=3]
    - img "OutSystems"
    - img "${githubActions}"
  `);
}

export async function checkAriaCareers(containers: ContainerLocators): Promise<void> {
  // セクション直下の見出し階層（h2 → 会社の h3）だけを契約にする。
  // プロジェクトカードの内部構造はカードにアンカーした checkAriaCareerCard が担う——
  // カードを article 等で包むかは実装の裁量で、包むと入れ子の深さが変わるため
  // （toMatchAriaSnapshot の部分一致は深さを飛ばせない）ここに書くと実装を縛ってしまう。
  await expect(containers.section("careers")).toMatchAriaSnapshot(`
    - heading "職務経歴詳細" [level=2]
    - heading "フリーランス (2022年1月～現在)" [level=3]
    - heading "トヨタ自動車株式会社 (2005年4月～2021年6月)" [level=3]
  `);
}

export async function checkAriaCareerCard(containers: ContainerLocators): Promise<void> {
  await expect(containers.careerProjectCard("freelance-construction")).toMatchAriaSnapshot(`
    - heading "自動車会社基幹システム（工事管理システム）の再構築" [level=4]
    - heading "期間" [level=5]
    - heading "ロールとタスク" [level=5]
    - list:
      - listitem
      - listitem
      - listitem
      - listitem
    - heading "メンバー数" [level=5]
    - heading "技術スタック" [level=5]
    - img "JavaScript"
    - img "CSharp"
    - img "OutSystems"
    - img "Oracle"
  `);
}

export async function checkAriaQualifications(containers: ContainerLocators): Promise<void> {
  // 「分類 → 資格」の階層がリストの入れ子として表現されることが仕様（平坦化しない）。
  await expect(containers.section("qualifications")).toMatchAriaSnapshot(`
    - heading "資格" [level=2]
    - list:
      - listitem:
        - list:
          - listitem: 基本情報技術者
          - listitem: 応用情報技術者
          - listitem: システムアーキテクト
          - listitem: プロジェクトマネージャ
      - listitem:
        - list:
          - listitem: G検定
          - listitem: E資格
      - listitem:
        - list:
          - listitem: AWS Certified Cloud Practitioner
          - listitem: AWS Certified Solutions Architect - Associate
      - listitem:
        - list:
          - listitem: 英語検定2級
          - listitem: 日商簿記検定2級
  `);
}

export async function checkAriaArtifactCard(containers: ContainerLocators): Promise<void> {
  await expect(containers.artifactCard("qiita-search")).toMatchAriaSnapshot(`
    - heading "Qiita記事検索" [level=4]
    - heading "URL" [level=5]
    - link "https://search-components-mui.vercel.app/":
      - /url: https://search-components-mui.vercel.app/
    - heading "リポジトリー" [level=5]
    - link "https://github.com/shoji9x9/search_components_mui":
      - /url: https://github.com/shoji9x9/search_components_mui
    - heading "技術スタック" [level=5]
    - img "React"
    - img "TypeScript"
    - img "Storybook"
    - img "Vercel"
    - heading "記事" [level=5]
    - link "React、TypeScriptでQiita記事検索機能作ってみた":
      - /url: https://zenn.dev/shoji9x9/articles/cdc688518da3f8
  `);
}

export async function checkAriaDesiredWork(containers: ContainerLocators): Promise<void> {
  await expect(containers.section("desired-work")).toMatchAriaSnapshot(`
    - heading "希望条件" [level=2]
    - link "${dataset.staticContent.desiredWorkTitle}":
      - /url: ${dataset.staticContent.desiredWorkUrl}
  `);
}

// ---------------------------------------------------------------------------
// 操作・状態
// ---------------------------------------------------------------------------

export async function checkBodyLinkHoverChangesColor(
  page: Page,
  containers: ContainerLocators,
): Promise<void> {
  const firstArtifact = dataset.artifacts[0];
  if (firstArtifact === undefined) throw new Error("artifacts.json が空です");
  const links = [
    containers.section("desired-work").getByRole("link"),
    containers
      .artifactCard("portfolio")
      .getByRole("link", { name: firstArtifact.url, exact: true }),
  ];

  for (const link of links) {
    await enterState(page, link, "default");
    const base = await computed(link, "color");
    await enterState(page, link, "hover");
    expect(await computed(link, "color"), "hover で文字色が変化しない").not.toBe(base);
  }
  await enterState(page, page.locator("body"), "default");
}

export async function checkBadgeLinkHoverUnchanged(
  page: Page,
  containers: ContainerLocators,
): Promise<void> {
  // 逆向きの仕様: 画像バッジのリンクには hover 装飾が無い。新側で不用意に装飾を足すと差分になる。
  const link = containers
    .section("account")
    .getByRole("link", { name: badgeLabelById(dataset.badges.account, "github"), exact: true });
  await enterState(page, link, "default");
  const base = await computed(link, "color");
  await enterState(page, link, "hover");
  expect(await computed(link, "color")).toBe(base);
  await enterState(page, page.locator("body"), "default");
}

export async function checkFocusRing(page: Page, containers: ContainerLocators): Promise<void> {
  const firstLink = containers
    .section("account")
    .getByRole("link", { name: badgeLabelById(dataset.badges.account, "github") });
  await page.locator("body").press("Tab");
  await expect(firstLink).toBeFocused();
  expect(await computed(firstLink, "outline-style"), "フォーカス時に outline が出ない").not.toBe(
    "none",
  );
}

export async function checkTabOrder(page: Page): Promise<void> {
  const expectedOrder = [
    // アカウントバッジの表示名は意図的差異の対象（新側のみ綴りが変わる）。side ごとの期待値を使う。
    ...dataset.badges.account.map((badge) => expectedBadgeLabel(badge)),
    ...dataset.artifacts.flatMap((artifact) => [
      artifact.url,
      artifact.repositoryUrl,
      ...(artifact.article === undefined ? [] : [artifact.article.title]),
    ]),
    dataset.staticContent.desiredWorkTitle,
  ];

  // 停止数の厳密一致は判定基準にしない（実装方式で変わりうる）。到達可能性と相対順序だけを見る。
  const visited = await tabThrough(page, expectedOrder.length + 10);
  const positions = expectedOrder.map((label) => visited.findIndex((stop) => stop.includes(label)));

  for (const [index, position] of positions.entries()) {
    expect(position, `"${expectedOrder[index]}" へ Tab で到達できない`).toBeGreaterThanOrEqual(0);
  }
  expect(positions, "Tab の到達順が文書順と一致しない").toEqual(
    [...positions].toSorted((a, b) => a - b),
  );
}

export async function checkColorSchemeSwitch(page: Page): Promise<void> {
  // 現行 CSS の唯一のメディアクエリが `prefers-color-scheme: dark`。切り替えが効くことは仕様。
  const body = page.locator("body");
  await page.emulateMedia({ colorScheme: "light" });
  const lightColor = await computed(body, "color");
  const lightBackground = await computed(body, "background-color");

  await page.emulateMedia({ colorScheme: "dark" });
  const darkColor = await computed(body, "color");
  const darkBackground = await computed(body, "background-color");

  await page.emulateMedia({ colorScheme: "light" });

  expect(darkColor, "dark で本文色が変わらない").not.toBe(lightColor);
  expect(darkBackground, "dark で背景色が変わらない").not.toBe(lightBackground);
}
