-- =============================================================================
-- 015_signup_grants_supabase_auth_admin
-- 가입 트리거가 auth.users 삽입 컨텍스트에서 돌 때 public.profiles / user_minihomes
-- INSERT 가 RLS·권한에 막히는 경우 완화 (Supabase 표준 롤 supabase_auth_admin)
-- SQL Editor 에서 실행 후 가입 재시도
-- =============================================================================

grant usage on schema public to supabase_auth_admin;

grant insert, select, update, delete on table public.profiles to supabase_auth_admin;
grant insert, select, update, delete on table public.user_minihomes to supabase_auth_admin;

grant usage, select on all sequences in schema public to supabase_auth_admin;

-- 트리거가 호출하는 함수들 (이미 있으면 무해)
grant execute on function public.profile_compute_admin_search(text) to supabase_auth_admin;
grant execute on function public.trg_profiles_set_admin_search() to supabase_auth_admin;
