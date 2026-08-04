import type { Artifact } from "@/data";

import { resolveTechStack } from "@/data";

import { BadgeRow } from "./BadgeImage";
import { TextLink } from "./TextLink";

/** カード内の小見出し（現行の Heading level=5 相当）。 */
function CardHeading({ children }: { children: string }) {
  return <h5 className="mb-2 text-lg font-semibold">{children}</h5>;
}

/**
 * 1 製作物のカード。現行は素の `div` だが、新側は `article` ＋ `aria-labelledby` で表現する
 * （職務経歴のプロジェクトカードと同じ方針）。
 */
function ArtifactCard({ artifact }: { artifact: Artifact }) {
  const headingId = `artifact-${artifact.id}-heading`;
  const badges = resolveTechStack(artifact.techStack);

  return (
    <article
      aria-labelledby={headingId}
      className="mr-4 mb-8 w-3xl rounded-lg border-2 border-card-border p-4 shadow-xl"
    >
      <h4 className="mb-4 text-xl font-semibold" id={headingId}>
        {artifact.title}
      </h4>

      <div className="mb-4 ml-2">
        <CardHeading>URL</CardHeading>
        {/* リンク文言は URL そのもの。表示文言とリンク先の両方が仕様。 */}
        <TextLink href={artifact.url}>{artifact.url}</TextLink>
      </div>

      <div className="mb-4 ml-2">
        <CardHeading>リポジトリー</CardHeading>
        <TextLink href={artifact.repositoryUrl}>{artifact.repositoryUrl}</TextLink>
      </div>

      <div className="mb-4 ml-2">
        <CardHeading>技術スタック</CardHeading>
        <BadgeRow badges={badges} className="mb-2" />
      </div>

      {/* 紹介記事が無い製作物では、リンクだけでなく「記事」見出しごと描画しない。 */}
      {artifact.article === undefined ? null : (
        <div className="mb-4 ml-2">
          <CardHeading>記事</CardHeading>
          <TextLink href={artifact.article.url}>{artifact.article.title}</TextLink>
        </div>
      )}
    </article>
  );
}

/** 製作物カードを並べる。表示順はデータの配列順が正本。 */
export function ArtifactSection({ artifacts }: { artifacts: readonly Artifact[] }) {
  return (
    <div className="flex flex-wrap">
      {artifacts.map((artifact) => (
        <ArtifactCard artifact={artifact} key={artifact.id} />
      ))}
    </div>
  );
}
