-- =============================================================================
-- 016_signup_rls_insert_supabase_auth_admin
-- GRANT(015)만으로는 부족한 경우: RLS ON 테이블은 INSERT 시 PERMISSIVE 정책이 있어야 함.
-- auth.users 가입 트리거가 supabase_auth_admin 컨텍스트에서 public 에 쓸 때
-- "new row violates row-level security policy" → GoTrue 가 "Database error saving new user" 로 표시.
-- SQL Editor 에서 실행 후 가입 재시도.
-- =============================================================================

create extension if not exists pgcrypto;

drop policy if exists profiles_insert_supabase_auth_admin on public.profiles;
create policy profiles_insert_supabase_auth_admin on public.profiles
  for insert
  to supabase_auth_admin
  with check (true);

drop policy if exists user_minihomes_insert_supabase_auth_admin on public.user_minihomes;
create policy user_minihomes_insert_supabase_auth_admin on public.user_minihomes
  for insert
  to supabase_auth_admin
  with check (true);
