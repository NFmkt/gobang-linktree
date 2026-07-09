import { getLinks } from "@/lib/links/getLinks";
import { SITE_CONFIG } from "@/lib/site/config";
import { ProfileHeader } from "@/components/public/ProfileHeader";
import { SocialRow } from "@/components/public/SocialRow";
import { LinkButton } from "@/components/public/LinkButton";
import { AffiliateButton } from "@/components/public/AffiliateButton";
import { Footer } from "@/components/public/Footer";
import { PageviewBeacon } from "@/components/public/PageviewBeacon";

const LINK_STAGGER_MS = 45;
/** 히어로(0) 이후 소셜 로우가 시작하는 지연 baseline. */
const SOCIAL_DELAY_MS = 80;
const LINKS_BASE_DELAY_MS = 140;

export default async function Home() {
  const links = await getLinks();

  return (
    <main className="flex flex-1 flex-col items-center">
      <PageviewBeacon />
      <ProfileHeader config={SITE_CONFIG} />

      <div className="flex w-full max-w-[480px] flex-1 flex-col gap-4 px-5 pb-2 pt-6">
        <div className="reveal" style={{ animationDelay: `${SOCIAL_DELAY_MS}ms` }}>
          <SocialRow items={SITE_CONFIG.social} />
        </div>

        <section aria-label="링크 목록" className="flex flex-col gap-3">
          {links.map((link, index) => (
            <LinkButton
              key={link.id}
              link={link}
              delayMs={LINKS_BASE_DELAY_MS + index * LINK_STAGGER_MS}
            />
          ))}
        </section>

        <AffiliateButton
          email={SITE_CONFIG.affiliateEmail}
          label={SITE_CONFIG.affiliateLabel}
          delayMs={LINKS_BASE_DELAY_MS + links.length * LINK_STAGGER_MS}
        />

        <Footer brandName={SITE_CONFIG.brandName} />
      </div>
    </main>
  );
}
