-- =============================================================================
-- 028_signup_supabase_auth_admin_select_execute
-- 가입 500 이 계속일 때 보조: 027 이후에 실행.
-- =============================================================================

drop policy if exists profiles_select_supabase_auth_admin on public.profiles;
create policy profiles_select_supabase_auth_admin on public.profiles
  for select
  to supabase_auth_admin
  using (true);

drop policy if exists user_minihomes_select_supabase_auth_admin on public.user_minihomes;
create policy user_minihomes_select_supabase_auth_admin on public.user_minihomes
  for select
  to supabase_auth_admin
  using (true);

grant execute on function public.handle_new_user() to supabase_auth_admin;

do $do$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ensure_minihome_for_profile'
  ) then
    execute 'grant execute on function public.ensure_minihome_for_profile() to supabase_auth_admin';
  end if;
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    execute 'grant execute on function public.set_updated_at() to supabase_auth_admin';
  end if;
end
$do$;
