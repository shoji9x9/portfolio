import type { Badge } from "@/data";

import { cn } from "@/lib/utils";

/**
 * 外部サービス（Shields.io・AtCoder）が返すバッジ画像。
 *
 * 代替テキストがそのままリンク・画像のアクセシブルネームになり、パリティスイートの
 * ロケータのアンカーでもある。`badge.label` 以外を渡さない。
 */
function BadgeImage({ badge }: { badge: Badge }) {
  return <img alt={badge.label} className="mr-2 h-5" src={badge.imageSrc} />;
}

/** リンクを持ちうるバッジ。アカウントバッジは必ず持ち、技術スタックのバッジは持たない。 */
type LinkableBadge = Badge & { href?: string };

/**
 * バッジを横並びにする器。器の幅で折り返す。
 *
 * 現行は折り返さず狭い画面では横にはみ出すが、新側は意図的に差異を持たせる（Issue #52）。
 * 横方向の間隔はバッジ側の `mr-2` が持つため、ここでは行間 `gap-y-2` だけを足す
 * （折り返さない幅では現行と同じ描画になる）。
 *
 * **バッジ行はすべてこの器を通す。** 折り返さない行が別に存在すると、そこだけ flex アイテムが
 * 縮んで画像が横に潰れる（横スクロールは出ないため `scrollWidth` では検出できない）。
 * 実際 Issue #52 の初回修正はアカウント行を取りこぼし、485px で 5 件すべてが自然幅の 75% に潰れていた。
 */
export function BadgeRow({
  badges,
  className,
}: {
  badges: readonly LinkableBadge[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-y-2", className)}>
      {badges.map((badge) =>
        badge.href === undefined ? (
          <BadgeImage badge={badge} key={badge.id} />
        ) : (
          <a href={badge.href} key={badge.id} rel="noreferrer" target="_blank">
            <BadgeImage badge={badge} />
          </a>
        ),
      )}
    </div>
  );
}
