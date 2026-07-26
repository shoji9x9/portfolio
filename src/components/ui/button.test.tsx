import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("既定ではフォームを送信しない", () => {
    expect(renderToStaticMarkup(<Button>送信しない</Button>)).toContain('type="button"');
  });

  it("呼び出し側で type を上書きできる", () => {
    expect(renderToStaticMarkup(<Button type="submit">送信する</Button>)).toContain(
      'type="submit"',
    );
  });
});
