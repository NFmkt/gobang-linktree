import { getLinks } from "@/lib/links/getLinks";
import { SITE_CONFIG } from "@/lib/site/config";
import { ProfileHeader } from "@/components/public/ProfileHeader";
import { SocialRow } from "@/components/public/SocialRow";
import { LinkButton } from "@/components/public/LinkButton";
import { AffiliateButton } from "@/components/public/AffiliateButton";
import { Footer } from "@/components/public/Footer";

const LINK_STAGGER_MS = 40;

export default async function Home() {
  const links = await getLinks();

  return (
    <main className="flex flex-1 justify-center bg-[var(--color-bg)] px-5">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <ProfileHeader config={SITE_CONFIG} />
        <SocialRow items={SITE_CONFIG.social} />

        <section aria-label="링크 목록" className="flex flex-col gap-3">
          {links.map((link, index) => (
            <LinkButton
              key={link.id}
              link={link}
              delayMs={index * LINK_STAGGER_MS}
            />
          ))}
        </section>

        <AffiliateButton
          email={SITE_CONFIG.affiliateEmail}
          label={SITE_CONFIG.affiliateLabel}
        />

        <Footer brandName={SITE_CONFIG.brandName} />
      </div>
    </main>
  );
}
