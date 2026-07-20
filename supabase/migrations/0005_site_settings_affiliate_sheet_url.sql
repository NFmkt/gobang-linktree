-- 0005_site_settings_affiliate_sheet_url.sql
-- 관리자 "제휴 문의" 탭에서 열어줄 외부 시트(구글 시트 등) 링크를 저장할 컬럼 추가.
-- 값이 없어도 되므로 빈 문자열을 기본값으로 사용한다(폼에서 필수 아님).

alter table public.site_settings
  add column if not exists affiliate_sheet_url text not null default '';

-- 참고: ALTER TABLE ADD COLUMN은 새 컬럼도 기존 테이블 단위 GRANT(0003/0004)의
-- 적용 범위에 자동으로 포함시킨다. 그래도 "service_role도 RLS 우회일 뿐 GRANT를
-- 자동으로 갖지 않는다"는 이 프로젝트의 함정을 매 마이그레이션에서 명시적으로
-- 재확인하는 관례를 따라, anon(select)과 service_role(전체) GRANT를 다시 선언한다.
grant select on public.site_settings to anon;
grant select, insert, update, delete on public.site_settings to service_role;
