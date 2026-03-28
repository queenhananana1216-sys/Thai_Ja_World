-- =============================================================================
-- 032_signup_profiles_admin_search_security_definer
-- 031 이후에도 "Database error creating new user" 일 때:
-- profiles BEFORE INSERT 트리거 trg_profiles_set_admin_search 가 SECURITY INVOKER 라
-- 가입 컨텍스트에서 RLS/권한에 걸릴 수 있음 → SECURITY DEFINER + row_security off.
-- auth.users → handle_new_user 트리거도 한 번 재연결.
-- Supabase SQL Editor 에서 전체 실행.
-- =============================================================================

create or replace function public.trg_profiles_set_admin_search()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  new.admin_search := public.profile_compute_admin_search(new.display_name);
  return new;
end;
$$;

alter function public.trg_profiles_set_admin_search() owner to postgres;

-- 트리거는 그대로 두고 함수만 교체 (이름 동일)

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.trg_profiles_set_admin_search() is
  'profiles admin_search 자동 채움. 가입 트리거 체인에서 RLS 회피용 SECURITY DEFINER.';
