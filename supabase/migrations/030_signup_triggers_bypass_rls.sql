-- =============================================================================
-- 030_signup_triggers_bypass_rls
-- 대시보드/앱에서 "Database error creating new user" 가 계속일 때:
-- auth.users → handle_new_user → profiles → ensure_minihome → user_minihomes
-- 체인 중 RLS 때문에 미니홈 INSERT 가 막히는 경우가 있어, 트리거 함수 실행 중
-- row_security 를 끕니다. (Supabase SQL Editor 에서 이 파일 전체 실행)
-- =============================================================================

create extension if not exists pgcrypto;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
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
  'auth.users INSERT 후 public.profiles 1행 생성. row_security=off 로 RLS·연쇄 트리거 완충.';

alter function public.handle_new_user() owner to postgres;

create or replace function public.ensure_minihome_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  candidate text;
  tries int := 0;
begin
  loop
    candidate := substring(encode(gen_random_bytes(9), 'hex') from 1 for 12);
    begin
      insert into public.user_minihomes (owner_id, public_slug, title)
      values (
        new.id,
        candidate,
        coalesce(new.display_name, '미니홈') || '님의 공간'
      );
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 8 then
        raise;
      end if;
    end;
  end loop;

  return new;
end;
$$;

alter function public.ensure_minihome_for_profile() owner to postgres;

grant usage on schema public to supabase_auth_admin;
grant insert, select, update, delete on table public.profiles to supabase_auth_admin;
grant insert, select, update, delete on table public.user_minihomes to supabase_auth_admin;
grant usage, select on all sequences in schema public to supabase_auth_admin;

grant execute on function public.handle_new_user() to supabase_auth_admin;
grant execute on function public.ensure_minihome_for_profile() to supabase_auth_admin;

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
