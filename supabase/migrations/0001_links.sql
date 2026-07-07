-- 0001_links.sql
-- 공개 링크페이지가 노출할 링크 테이블.
-- 주의: 이 마이그레이션은 실 Supabase 키가 준비된 이후 적용한다 (S1a 시점 미실행).

create table if not exists public.links (
  id text primary key,
  title text not null,
  url text not null,
  icon text not null,
  subtitle text,
  "order" integer not null,
  active boolean not null default true,
  thumbnail text,
  created_at timestamptz not null default now()
);

-- RLS(Row Level Security) 활성화: 기본적으로 모든 접근을 차단하고 정책으로만 허용한다.
alter table public.links enable row level security;

-- 공개 읽기 정책: active = true인 행만 anon(익명) 사용자가 조회 가능.
create policy "공개 링크는 active=true인 경우에만 anon이 조회 가능"
  on public.links
  for select
  to anon
  using (active = true);

-- 초기 시드 데이터 (src/lib/links/seed.ts의 SEED_LINKS와 동일한 값).
-- idempotent: 이미 존재하는 id는 건너뛴다.
insert into public.links (id, title, url, icon, "order", active)
values
  ('youth', '청년주택 공고 확인', 'https://gobang.kr/youth', 'youth', 1, true),
  ('feed', '청년혜택 모아보기', 'https://gobang.kr/feed', 'feed', 2, true),
  ('series', '자취 꿀정보', 'https://gobang.kr/feed/series', 'series', 3, true)
on conflict (id) do nothing;
