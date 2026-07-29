// 操作アダプタ層。
//
// **ロケータが移植可能でも、操作は移植可能ではない。** 論理名の裏に操作を隠し、スペック本体には
// 「何をしたいか」だけを書く。現行 `/` はフォーム・ダイアログ・メニュー・セレクトを持たない静的
// ページなので、現時点の操作は「状態へ遷移させる」系だけで足りる。新側で実装機構が変わっても
// （例: リンクをボタン化する）差し替えはこのファイルに閉じる。
import type { Locator, Page } from "@playwright/test";

/** 差分比較で扱う要素の状態。`metadata.json` の capture_conditions.states と対応する。 */
export type ElementState = "default" | "hover" | "focus";

/** 対象要素を指定の状態へ遷移させる。遷移後の見た目の比較は parity-diff の担当。 */
export async function enterState(page: Page, target: Locator, state: ElementState): Promise<void> {
  switch (state) {
    case "default":
      // マウスをページ外の角へ退避し、focus も外す。
      await page.mouse.move(0, 0);
      await page.locator("body").evaluate((body: HTMLElement) => {
        const active = body.ownerDocument.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
      return;
    case "hover":
      await target.hover();
      return;
    case "focus":
      await target.focus();
      return;
  }
}

/**
 * Tab による到達順を返す（到達可能性と論理的順序の確認用）。
 * **停止数・順序の厳密一致は判定基準にしない。** 実装方式で停止数は変わりうるため、
 * 呼び出し側は「期待する要素がすべて到達可能で、相対順序が保たれている」ことだけを見る。
 */
export async function tabThrough(page: Page, maxStops: number): Promise<string[]> {
  const visited: string[] = [];
  await page.locator("body").press("Tab");
  for (let i = 0; i < maxStops; i += 1) {
    const descriptor = await page.evaluate(() => {
      const active = document.activeElement;
      if (active === null || active === document.body) return null;
      const image = active.querySelector("img");
      const label = active.getAttribute("aria-label") ?? image?.alt ?? active.textContent ?? "";
      return `${active.tagName.toLowerCase()}:${label.trim()}`;
    });
    if (descriptor === null) break;
    if (visited.includes(descriptor)) break;
    visited.push(descriptor);
    await page.keyboard.press("Tab");
  }
  return visited;
}
