import { ArtifactSection } from "@/components/portfolio/ArtifactSection";
import { BadgeRow } from "@/components/portfolio/BadgeImage";
import { CareerSection } from "@/components/portfolio/CareerSection";
import { PortfolioSection } from "@/components/portfolio/PortfolioSection";
import { ProfileTable } from "@/components/portfolio/ProfileTable";
import { Qualifications } from "@/components/portfolio/Qualifications";
import { TextLink } from "@/components/portfolio/TextLink";
import { artifacts, badges, careers, profile, staticContent } from "@/data";

/**
 * ポートフォリオの単一ページ。
 *
 * セクションの並びは現行 `/` と同じで、意図的差異レジストリの `keep`
 * （公開ルートと単一ページのセクション順）に従う。LAPRAS セクションは機能 `lapras`
 * （Issue #23）の担当で、このページに後から重ねる。
 */
function App() {
  return (
    <main className="p-24">
      <PortfolioSection
        heading={
          <span>
            <span className="mr-2 align-middle">プロフィール</span>
            {/* 現行と同じ装飾画像（バイト列も一致）。`public/` から配信する。 */}
            <img alt="DotHiyoko" className="inline" src="/dot_hiyoko.png" />
          </span>
        }
        id="profile"
      >
        <ProfileTable entries={profile} />
      </PortfolioSection>

      <PortfolioSection heading="アカウント" id="account">
        <div className="flex items-center">
          {badges.account.map((badge) => (
            <a href={badge.href} key={badge.id} rel="noreferrer" target="_blank">
              <img alt={badge.label} className="mr-2 h-5" src={badge.imageSrc} />
            </a>
          ))}
        </div>
      </PortfolioSection>

      <PortfolioSection heading="自己PR" id="self-promotion">
        <ul className="list-inside list-disc">
          {staticContent.selfPromotion.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </PortfolioSection>

      <PortfolioSection heading="保有スキル" id="skills">
        <div className="mb-4 ml-2">
          <h3 className="mb-2 text-2xl font-semibold">言語</h3>
          <BadgeRow badges={badges.language} />
        </div>
        <div className="mb-4 ml-2">
          <h3 className="mb-2 text-2xl font-semibold">フレームワーク・ミドルウェア等</h3>
          <BadgeRow badges={badges.framework} />
        </div>
      </PortfolioSection>

      <PortfolioSection heading="職務経歴詳細" id="careers">
        <CareerSection careers={careers} />
      </PortfolioSection>

      <PortfolioSection heading="資格" id="qualifications">
        <Qualifications groups={staticContent.qualifications} />
      </PortfolioSection>

      <PortfolioSection heading="製作物" id="artifacts">
        <ArtifactSection artifacts={artifacts} />
      </PortfolioSection>

      <PortfolioSection heading="希望条件" id="desired-work">
        <TextLink href={staticContent.desiredWork.url}>{staticContent.desiredWork.title}</TextLink>
      </PortfolioSection>
    </main>
  );
}

export default App;
