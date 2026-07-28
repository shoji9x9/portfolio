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

/** バッジを横並びにする器。現行と同じく折り返さない（狭い画面では横にはみ出す）。 */
export function BadgeRow({ badges, className }: { badges: readonly Badge[]; className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      {badges.map((badge) => (
        <BadgeImage badge={badge} key={badge.id} />
      ))}
    </div>
  );
}
