-- 0004_grant_service_role.sql
-- 관리자 API(createServiceSupabaseClient, service_role 키)가 links/events/site_settings에
-- 접근할 때 "permission denied for table X"(42501)가 발생하는 문제 수정.
--
-- 원인: service_role은 RLS(행 단위 정책)를 우회하지만, 기본 테이블 권한(GRANT)까지
-- 자동으로 갖는 건 아니다. 0001~0003 마이그레이션이 anon에는 grant를 줬지만
-- service_role에는 한 번도 명시적으로 grant를 준 적이 없었다.
--
-- service_role은 관리자 전용(서버 코드에서만 사용, RLS 우회)이므로 전 테이블 전 권한을 부여한다.

grant select, insert, update, delete on public.links to service_role;
grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.site_settings to service_role;
