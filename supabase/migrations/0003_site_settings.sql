-- 0003_site_settings.sql
-- 사이트 전역 설정(싱글턴 1행). 브랜드명/bio/소셜 URL/제휴 문의 정보.

create table if not exists public.site_settings (
  id text primary key default 'default',
  brand_name text not null,
  bio text not null,
  social jsonb not null,
  affiliate_email text not null,
  affiliate_label text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "공개 설정은 누구나 조회 가능"
  on public.site_settings
  for select
  to anon
  using (true);

grant select on public.site_settings to anon;

insert into public.site_settings (id, brand_name, bio, social, affiliate_email, affiliate_label)
values (
  'default',
  '고방',
  '청년주택 청년혜택 자취 꿀정보',
  '[
    {"key":"home","label":"공식 홈페이지","url":"https://gobang.kr/home?p=homeAdvertisingPopup"},
    {"key":"blog","label":"블로그","url":"https://blog.naver.com/neoflat1116"},
    {"key":"instagram","label":"인스타그램","url":"https://www.instagram.com/gobang.kr"},
    {"key":"youtube","label":"유튜브","url":"https://www.youtube.com/@youth_info"},
    {"key":"kakao","label":"카카오톡 오픈채팅","url":"https://open.kakao.com/o/gspAuZ5"}
  ]'::jsonb,
  'neoflatworks2@gmail.com',
  '제휴·협력 문의'
)
on conflict (id) do nothing;
