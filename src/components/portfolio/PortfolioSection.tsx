import type { PropsWithChildren, ReactNode } from "react";

type PortfolioSectionProps = PropsWithChildren<{
  /** 見出しと section を関連付ける id。パリティスイートの論理名（セクション ID）と揃える。 */
  id: string;
  /** 見出しの文言。装飾要素を含めたい場合は ReactNode を渡す。 */
  heading: ReactNode;
}>;

/**
 * `/` の表示セクション。
 *
 * 現行は role を持たない素の `div` にすぎないが、新側では `section` ＋ `aria-labelledby` で
 * ランドマーク（role=region）として表現する。支援技術でセクション単位に移動できるようになるため。
 * 構造が変わってもパリティスイートはロケータマッピング層で吸収する（論理名は不変）。
 */
export function PortfolioSection({ id, heading, children }: PortfolioSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className="mb-8">
      <h2 className="mb-3 text-3xl font-semibold" id={headingId}>
        {heading}
      </h2>
      {children}
    </section>
  );
}
