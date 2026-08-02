import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import App from "@/App";
import { artifacts, badges, careers, lapras, profile, staticContent } from "@/data";

/**
 * 描画の網羅的な検証はパリティスイート（Playwright）が実ブラウザーで行う。
 * ここでは Node 上で「壊れずに描画でき、データ由来の要素が抜け落ちていない」ことだけを見る
 * （スイートより速く、CI で常時回るゲートとして機能する）。
 */
/** React の renderToStaticMarkup は属性値の & と " をエスケープする。突き合わせる側も揃える。 */
function attr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

/**
 * セクション見出しの id（パリティスイートの論理名と揃えてある）と文言。並びも仕様。
 *
 * `decorated` はプロフィールだけ。現行に合わせて見出しへ装飾画像を含めるため、
 * 見出しの中身が素のテキストにならない。
 */
const SECTION_HEADINGS: readonly { id: string; text: string; decorated?: boolean }[] = [
  { id: "profile-heading", text: "プロフィール", decorated: true },
  { id: "account-heading", text: "アカウント" },
  { id: "self-promotion-heading", text: "自己PR" },
  { id: "skills-heading", text: "保有スキル" },
  { id: "careers-heading", text: "職務経歴詳細" },
  { id: "qualifications-heading", text: "資格" },
  { id: "artifacts-heading", text: "製作物" },
  { id: "desired-work-heading", text: "希望条件" },
  { id: "lapras-heading", text: "LAPRAS" },
];

describe("App", () => {
  const html = renderToStaticMarkup(<App />);

  it("セクション見出しを仕様の順で描画する", () => {
    // タグを剥がして本文だけを取り出す形にはしない。HTML を正規表現で除去する処理は、
    // 入力が信頼できても不完全なサニタイズとして検出される（CodeQL
    // js/incomplete-multi-character-sanitization）。id の並びと中身を直接見る。
    const headings = [...html.matchAll(/<h2\b[^>]*\bid="([^"]*)"[^>]*>(.*?)<\/h2>/gs)].map(
      (match) => ({ id: match[1], inner: match[2] ?? "" }),
    );

    expect(headings.map((heading) => heading.id)).toEqual(
      SECTION_HEADINGS.map((section) => section.id),
    );

    for (const [index, section] of SECTION_HEADINGS.entries()) {
      const inner = headings[index]?.inner ?? "";
      if (section.decorated) {
        // 前後をタグ境界で挟み、文言の後ろに別の語が続いても通らないようにする。
        expect(inner, `${section.id} の文言`).toContain(`>${section.text}<`);
        expect(inner, `${section.id} の装飾画像`).toContain('alt="DotHiyoko"');
      } else {
        expect(inner, `${section.id} の文言`).toBe(section.text);
      }
    }
  });

  it("プロフィールの全項目を表に描画する", () => {
    for (const entry of profile) {
      expect(html).toContain(entry.label);
      expect(html).toContain(entry.value);
    }
  });

  it("すべてのバッジを alt・画像 URL 付きで描画する", () => {
    for (const badge of [...badges.account, ...badges.language, ...badges.framework]) {
      expect(html, `${badge.id} の alt が無い`).toContain(`alt="${badge.label}"`);
      // alt だけだと、別の画像を指していても通ってしまう。src との対応まで見る。
      expect(html, `${badge.id} の alt と画像 URL が対応していない`).toContain(
        `<img alt="${attr(badge.label)}" class="mr-2 h-5" src="${attr(badge.imageSrc)}"/>`,
      );
    }
    for (const badge of badges.account) {
      // アカウントバッジは画像をリンクで包む。リンクと画像の対応まで見る。
      expect(html, `${badge.id} のリンクが画像を包んでいない`).toContain(
        `<a href="${attr(badge.href)}" rel="noreferrer" target="_blank"><img alt="${attr(badge.label)}" class="mr-2 h-5" src="${attr(badge.imageSrc)}"/></a>`,
      );
    }
  });

  it("技術スタックのバッジをカードごとに件数どおり描画する", () => {
    // 保有スキルセクションに同じ alt が既出のため、`toContain` だけでは
    // カード内の技術スタックが空でも通ってしまう。出現回数で数える。
    const occurrences = (needle: string): number => html.split(needle).length - 1;
    const expectedCount = new Map<string, number>();
    const count = (id: string): void => {
      expectedCount.set(id, (expectedCount.get(id) ?? 0) + 1);
    };
    for (const badge of [...badges.language, ...badges.framework]) count(badge.id);
    for (const career of careers) {
      for (const project of career.projects) for (const id of project.techStack.items) count(id);
    }
    for (const artifact of artifacts) for (const id of artifact.techStack) count(id);

    for (const [id, expected] of expectedCount) {
      const badge = [...badges.language, ...badges.framework].find((entry) => entry.id === id);
      expect(badge, `${id} が badges.json にない`).toBeDefined();
      if (badge === undefined) continue;
      expect(occurrences(`src="${attr(badge.imageSrc)}"`), `${id} の描画回数が期待と違う`).toBe(
        expected,
      );
    }
  });

  it("職務経歴の全プロジェクトを描画する", () => {
    for (const career of careers) {
      expect(html).toContain(career.company);
      for (const project of career.projects) {
        expect(html).toContain(project.name);
        expect(html).toContain(project.term);
        expect(html).toContain(
          `チーム: ${project.members.team}名 プロジェクト全体: ${project.members.project}名`,
        );
        for (const roleTask of project.roleTasks) {
          expect(html).toContain(roleTask.summary);
          for (const item of roleTask.items) expect(html).toContain(item);
        }
        if (project.techStack.comment !== undefined) {
          expect(html).toContain(project.techStack.comment);
        }
      }
    }
  });

  it("製作物の全リンクを描画する", () => {
    for (const artifact of artifacts) {
      expect(html).toContain(artifact.title);
      expect(html).toContain(`href="${attr(artifact.url)}"`);
      expect(html).toContain(`href="${attr(artifact.repositoryUrl)}"`);
      expect(html).toContain(`href="${attr(artifact.article.url)}"`);
    }
  });

  it("自己 PR・資格・希望条件を描画する", () => {
    for (const item of staticContent.selfPromotion) {
      expect(html).toContain(item);
    }
    for (const group of staticContent.qualifications) {
      expect(html).toContain(group.name);
      for (const item of group.items) {
        expect(html).toContain(item);
      }
    }
    expect(html).toContain(staticContent.desiredWork.title);
    expect(html).toContain(`href="${attr(staticContent.desiredWork.url)}"`);
  });

  it("LAPRAS 取得前は公開プロフィールへのフォールバックを描画する", () => {
    expect(html).toContain("LAPRAS 公開プロフィール");
    expect(html).toContain(`href="${attr(lapras.publicUrl)}"`);
  });
});
