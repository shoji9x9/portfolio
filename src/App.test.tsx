import { renderToStaticMarkup } from "react-dom/server";

import App from "@/App";

describe("App", () => {
  it("見出し 'portfolio' を描画する", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("portfolio");
  });
});
