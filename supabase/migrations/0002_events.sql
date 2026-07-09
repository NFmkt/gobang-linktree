-- 0002_events.sql
-- 공개페이지 pageview/click 이벤트를 저장하는 익명 집계 테이블.
-- 개인식별정보(IP 원문 등)는 절대 저장하지 않는다.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('pageview', 'click')),
  link_id text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

-- RLS 활성화: 기본적으로 모든 접근을 차단하고 정책으로만 허용한다.
alter table public.events enable row level security;

-- 익명 방문자는 이벤트를 insert만 할 수 있다 (읽기는 S6에서 service_role로만 수행).
create policy "anon은 이벤트를 insert만 할 수 있음"
  on public.events
  for insert
  to anon
  with check (true);

-- RLS 정책과 별개로 anon 롤 자체에 INSERT 권한을 부여해야 한다
-- (0001_links.sql 적용 때 GRANT SELECT 누락으로 permission denied가 났던 것과 동일한 계층).
grant insert on public.events to anon;
