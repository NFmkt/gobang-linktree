import { describe, it, expect } from "vitest";
import { generateMetadata } from "../layout";
import { SITE_CONFIG } from "@/lib/site/config";

/**
 * S7: layout.tsx의 metadata가 OG/Twitter 카드 및 metadataBase를
 * getSiteConfig() 값과 일치하게 설정하는지 검증한다.
 * (S5부터 generateMetadata가 getSiteConfig()를 통해 DB 값을 반영 —
 * NEXT_PUBLIC_SUPABASE_URL 미설정 로컬 테스트 환경에서는 SITE_CONFIG로 폴백)
 */
describe("layout metadata (S7 OG/메타 태그, S5부터 getSiteConfig 연동)", () => {
  it("metadataBase가 설정되어 있다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("title/description이 SITE_CONFIG 값과 일치한다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.title/description이 SITE_CONFIG 값과 일치한다", async () => {
    const metadata = await generateMetadata();
    const og = metadata.openGraph;
    expect(og).toBeDefined();
    expect(og?.title).toBe(SITE_CONFIG.brandName);
    expect(og?.description).toBe(SITE_CONFIG.bio);
  });

  it("openGraph.images가 존재한다", async () => {
    const metadata = await generateMetadata();
    const images = metadata.openGraph?.images;
    expect(images).toBeDefined();
    expect(Array.isArray(images) ? images.length : 1).toBeGreaterThan(0);
  });

  it("twitter 카드가 summary_large_image로 설정된다", async () => {
    const metadata = await generateMetadata();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe(SITE_CONFIG.brandName);
    expect(metadata.twitter?.description).toBe(SITE_CONFIG.bio);
  });
});
