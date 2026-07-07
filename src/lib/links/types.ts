/**
 * 공개 링크페이지에 노출되는 개별 링크 항목.
 *
 * 실 DB 스키마(supabase/migrations/0001_links.sql)와 1:1로 대응한다.
 */
export type Link = {
  /** 고유 식별자 (slug 형태) */
  id: string;
  /** 화면에 표시되는 제목 */
  title: string;
  /** 이동 대상 URL */
  url: string;
  /** 아이콘 키 — 실제 SVG 매핑은 S1b에서 처리 */
  icon: string;
  /** 제목 아래 보조 설명 (선택) */
  subtitle?: string;
  /** 노출 순서 (오름차순) */
  order: number;
  /** 공개 페이지 노출 여부 */
  active: boolean;
  /** 썸네일 이미지 경로 (선택) */
  thumbnail?: string;
};
