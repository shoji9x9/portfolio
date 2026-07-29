import type { PropsWithChildren } from "react";

/**
 * 本文中の外部リンク。
 *
 * 色は design token（`--link` / `--link-hover`）を使う。現行の `text-blue-500` /
 * `hover:text-blue-700`（Tailwind v3 のパレット値）をトークンへ固定してあるため、
 * v4 のパレット既定値の違いが見た目に出ない。
 *
 * `target="_blank"` には `rel="noreferrer"` を伴わせる。現行は付けていないが、これは
 * リンク先へ参照元を渡さないための安全側の修正で、表示・振る舞いのパリティには影響しない。
 */
export function TextLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <a
      className="text-link underline hover:text-link-hover"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  );
}
