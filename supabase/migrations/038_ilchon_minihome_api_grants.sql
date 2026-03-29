-- 일촌·미니홈 — API(anon/authenticated)에 필요한 테이블 권한 명시
-- RLS가 행 단위로 제한함. 037만 적용 시 일부 프로젝트에서 PostgREST가 permission denied를 낼 수 있어 보강.

grant select on table public.ilchon_requests to authenticated;
grant select on table public.ilchon_links to authenticated;

grant select on table public.user_minihomes to anon, authenticated;
grant update on table public.user_minihomes to authenticated;
