import { SITE_CONFIG, type SiteConfig } from "./config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * 사이트 전역 설정을 가져온다.
 *
 * NEXT_PUBLIC_SUPABASE_URL이 설정돼 있으면 site_settings 테이블에서 조회하고,
 * 없으면(로컬 키 미설정) 정적 SITE_CONFIG로 폴백한다(getLinks()와 동일 패턴).
 */
export async function getSiteConfig(): Promise<SiteConfig> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return SITE_CONFIG;
  }

  // 명시적 컬럼 목록 대신 "*"를 사용한다: affiliate_sheet_url 컬럼을 추가하는
  // 마이그레이션(0005)이 아직 배포 DB에 적용되지 않은 상태에서 이 코드가 먼저
  // 배포돼도, "*"는 존재하는 컬럼만 돌려주므로 42703(column does not exist)
  // 에러 없이 동작한다. 누락된 필드는 아래에서 빈 문자열로 보정한다.
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(`site_settings 조회 실패: ${error.message}`);
  }
  if (!data) {
    return SITE_CONFIG;
  }

  return {
    brandName: data.brand_name,
    bio: data.bio,
    logoLabel: SITE_CONFIG.logoLabel,
    social: data.social,
    affiliateEmail: data.affiliate_email,
    affiliateLabel: data.affiliate_label,
    affiliateSheetUrl: data.affiliate_sheet_url ?? "",
  };
}
