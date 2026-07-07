import type { Link } from "./types";

/**
 * 초기 시드 링크 데이터.
 *
 * 로컬 우선 개발 단계의 기본 데이터 소스이며, 실 Supabase 연결 전까지
 * `getLinks`가 이 배열을 그대로 사용한다. 실 DB 마이그레이션에도 동일한
 * 값이 INSERT된다 (supabase/migrations/0001_links.sql 참고).
 */
export const SEED_LINKS: Link[] = [
  {
    id: "youth",
    title: "청년주택 공고 확인",
    url: "https://gobang.kr/youth",
    icon: "youth",
    order: 1,
    active: true,
  },
  {
    id: "feed",
    title: "청년혜택 모아보기",
    url: "https://gobang.kr/feed",
    icon: "feed",
    order: 2,
    active: true,
  },
  {
    id: "series",
    title: "자취 꿀정보",
    url: "https://gobang.kr/feed/series",
    icon: "series",
    order: 3,
    active: true,
  },
];
