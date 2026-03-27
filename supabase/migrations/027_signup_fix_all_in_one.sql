-- =============================================================================
-- 027_signup_fix_all_in_one
-- POST /auth/v1/signup → 500, 화면 "Database error saving new user" 일 때
-- Supabase → SQL Editor 에서 이 파일 전체 실행 → 가입 재시도.
-- (014 + 015 + 016 내용 통합, idempotent)
-- =============================================================================

-- ── 014: handle_new_user 안전 버전 ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dn text;
  em text;
begin
  em := new.email;
  dn := nullif(trim(new.raw_user_meta_data->>'display_name'), '');
  if dn is null and em is not null and position('@' in em) > 0 then
    dn := split_part(em, '@', 1);
  end if;
  if dn is null or dn = '' then
    dn := 'user';
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, dn, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT 후 public.profiles 1행 생성. 이메일 없음·표시명 없음에도 안전.';

alter function public.handle_new_user() owner to postgres;

do $do$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ensure_minihome_for_profile'
  ) then
    execute 'alter function public.ensure_minihome_for_profile() owner to postgres';
  end if;
exception
  when insufficient_privilege then
    null;
end
$do$;

-- ── 015: supabase_auth_admin GRANT ────────────────────────────────────────
grant usage on schema public to supabase_auth_admin;

grant insert, select, update, delete on table public.profiles to supabase_auth_admin;
grant insert, select, update, delete on table public.user_minihomes to supabase_auth_admin;

grant usage, select on all sequences in schema public to supabase_auth_admin;

grant execute on function public.profile_compute_admin_search(text) to supabase_auth_admin;
grant execute on function public.trg_profiles_set_admin_search() to supabase_auth_admin;

-- ── 016: RLS INSERT 정책 (GRANT 만으로는 부족할 때) ───────────────────────
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
