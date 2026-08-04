import type { Career, Project } from "@/data";

import { resolveTechStack } from "@/data";

import { BadgeRow } from "./BadgeImage";

/** カード内の小見出し（現行の Heading level=5 相当）。 */
function CardHeading({ children }: { children: string }) {
  return <h5 className="mb-2 text-lg font-semibold">{children}</h5>;
}

/**
 * 1 プロジェクトのカード。
 *
 * 現行は素の `div` だが、新側は `article` ＋ `aria-labelledby` で独立した記事として表現する。
 * ロケータマッピング層が構造差を吸収するため、論理名は現行と同じまま。
 */
function ProjectCard({ project }: { project: Project }) {
  const headingId = `career-project-${project.id}-heading`;
  const badges = resolveTechStack(project.techStack.items);

  return (
    <article
      aria-labelledby={headingId}
      className="mr-4 mb-8 w-full max-w-3xl rounded-lg border-2 border-card-border p-4 shadow-xl"
    >
      <h4 className="mb-4 text-xl font-semibold" id={headingId}>
        {project.name}
      </h4>

      <div className="mb-4 ml-2">
        <CardHeading>期間</CardHeading>
        {project.term}
      </div>

      <div className="mb-4 ml-2">
        <CardHeading>ロールとタスク</CardHeading>
        {project.roleTasks.map((roleTask) => (
          <div className="mb-2" key={roleTask.summary}>
            {roleTask.summary}
            <ul className="list-inside list-disc">
              {roleTask.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mb-4 ml-2">
        <CardHeading>メンバー数</CardHeading>
        チーム: {project.members.team}名 プロジェクト全体: {project.members.project}名
      </div>

      <div className="mb-4 ml-2">
        <CardHeading>技術スタック</CardHeading>
        <BadgeRow badges={badges} className="mb-2" />
        {project.techStack.comment}
      </div>
    </article>
  );
}

/** 会社ごとにプロジェクトカードを並べる。表示順はデータの配列順が正本。 */
export function CareerSection({ careers }: { careers: readonly Career[] }) {
  return (
    <>
      {careers.map((career) => (
        <div className="mb-4 ml-2" key={career.id}>
          <h3 className="mb-2 text-2xl font-semibold">{career.company}</h3>
          <div className="flex flex-wrap">
            {career.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
