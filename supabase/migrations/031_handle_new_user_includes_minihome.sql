-- =============================================================================
-- 031_handle_new_user_includes_minihome
-- 030 이후에도 "Database error creating new user" 면:
-- profiles AFTER INSERT 트리거(ensure_minihome)가 부모와 다른 RLS 컨텍스트에서
-- 돌 수 있어, 미니홈 INSERT 를 auth 트리거(handle_new_user) 안으로 합칩니다.
-- Supabase SQL Editor 에서 전체 실행.
-- =============================================================================

create extension if not exists pgcrypto;

-- 연쇄 트리거 제거 — 미니홈은 아래 handle_new_user 에서만 생성
drop trigger if exists trg_profiles_ensure_minihome on public.profiles;

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
  candidate text;
  tries int := 0;
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

  if not exists (select 1 from public.user_minihomes m where m.owner_id = new.id) then
    loop
      candidate := substring(encode(gen_random_bytes(9), 'hex') from 1 for 12);
      begin
        insert into public.user_minihomes (owner_id, public_slug, title)
        values (
          new.id,
          candidate,
          coalesce(dn, '미니홈') || '님의 공간'
        );
        exit;
      exception when unique_violation then
        tries := tries + 1;
        if tries > 8 then
          raise;
        end if;
      end;
    end loop;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'auth.users INSERT → profiles + user_minihomes 한 함수에서 처리. row_security=off.';

alter function public.handle_new_user() owner to postgres;

grant execute on function public.handle_new_user() to supabase_auth_admin;

-- ensure_minihome 함수가 있으면 소유자만 정리(없으면 무시)
do $do$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'ensure_minihome_for_profile'
  ) then
    execute 'alter function public.ensure_minihome_for_profile() owner to postgres';
  end if;
exception when undefined_function then
  null;
end
$do$;
