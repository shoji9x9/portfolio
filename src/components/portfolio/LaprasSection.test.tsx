import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LaprasPreviewContent } from "./LaprasSection";

const lapras = { publicUrl: "https://lapras.com/public/shoji9x9" };

describe("LaprasPreviewContent", () => {
  it("取得前・失敗時は公開プロフィールのテキストリンクを表示する", () => {
    const html = renderToStaticMarkup(<LaprasPreviewContent lapras={lapras} preview={null} />);
    expect(html).toContain("LAPRAS 公開プロフィール");
    expect(html).toContain(`href="${lapras.publicUrl}"`);
    expect(html).not.toContain("<img");
  });

  it("成功時はプレビュー画像を公開プロフィールへのリンクで包む", () => {
    const html = renderToStaticMarkup(
      <LaprasPreviewContent
        lapras={lapras}
        preview={{
          title: "shoji9x9さんのLAPRAS Profile",
          image: "https://media.lapras.com/media/public_setting/example.png",
          url: lapras.publicUrl,
        }}
      />,
    );
    expect(html).toContain('alt="shoji9x9さんのLAPRAS Profile"');
    expect(html).toContain(`href="${lapras.publicUrl}"`);
    expect(html).toContain("https://media.lapras.com/media/public_setting/example.png");
  });
});
