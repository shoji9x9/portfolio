import { describe, expect, it } from "vitest";

import { parseLaprasPreview } from "./lapras-preview";

const publicUrl = "https://lapras.com/public/shoji9x9";

describe("parseLaprasPreview", () => {
  it("検証済みのプレビューを返す", () => {
    const preview = {
      title: "shoji9x9さんのLAPRAS Profile",
      image: "https://media.lapras.com/media/public_setting/example.png",
      url: publicUrl,
    };
    expect(parseLaprasPreview(preview, publicUrl)).toEqual(preview);
  });

  it.each([
    null,
    {},
    { title: "", image: "https://media.lapras.com/image.png", url: publicUrl },
    { title: "title", image: "http://media.lapras.com/image.png", url: publicUrl },
    { title: "title", image: "https://example.com/image.png", url: publicUrl },
    {
      title: "title",
      image: "https://media.lapras.com/image.png",
      url: "https://example.com/",
    },
  ])("不正な値 %# は拒否する", (value) => {
    expect(parseLaprasPreview(value, publicUrl)).toBeNull();
  });
});
