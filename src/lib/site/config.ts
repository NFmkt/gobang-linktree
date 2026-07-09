/**
 * 소셜/외부 링크 하나를 나타낸다.
 */
export type SocialItem = {
  /** 고유 키 (아이콘 매핑 등에 사용) */
  key: string;
  /** 화면/접근성 라벨 */
  label: string;
  /** 이동 대상 URL */
  url: string;
};

/**
 * 사이트 전역 기본 설정.
 */
export type SiteConfig = {
  /** 브랜드명 */
  brandName: string;
  /** 프로필 소개 문구 */
  bio: string;
  /** 로고 마크 텍스트 (실제 이미지 로고는 S7에서 교체) */
  logoLabel: string;
  /** 소셜/외부 링크 목록 */
  social: SocialItem[];
  /** 제휴·협력 문의 이메일 */
  affiliateEmail: string;
  /** 제휴·협력 문의 라벨 */
  affiliateLabel: string;
};

/**
 * 사이트 기본 설정값.
 *
 * 지금은 정적 상수이며, S5에서 관리자 편집 기능이 추가되면
 * 이 값이 DB 기반 설정으로 대체될 예정이다.
 */
export const SITE_CONFIG: SiteConfig = {
  brandName: "고방",
  bio: "청년주택 청년혜택 자취 꿀정보",
  logoLabel: "GYI",
  social: [
    {
      key: "home",
      label: "공식 홈페이지",
      url: "https://gobang.kr/home?p=homeAdvertisingPopup",
    },
    {
      key: "blog",
      label: "블로그",
      url: "https://blog.naver.com/neoflat1116",
    },
    {
      key: "instagram",
      label: "인스타그램",
      url: "https://www.instagram.com/gobang.kr",
    },
    {
      key: "youtube",
      label: "유튜브",
      url: "https://www.youtube.com/@youth_info",
    },
    {
      key: "kakao",
      label: "카카오톡 오픈채팅",
      url: "https://open.kakao.com/o/gspAuZ5",
    },
  ],
  affiliateEmail: "neoflatworks2@gmail.com",
  affiliateLabel: "제휴·협력 문의",
};

/**
 * `site_settings` 테이블의 원본 행 모양(snake_case). getSiteConfig()가
 * 이 모양을 조회해 SiteConfig(camelCase)로 매핑한다.
 */
export type SiteSettingsRow = {
  id: string;
  brand_name: string;
  bio: string;
  social: SocialItem[];
  affiliate_email: string;
  affiliate_label: string;
};
