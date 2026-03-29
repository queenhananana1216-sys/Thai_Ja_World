-- =============================================================================
-- 034_signup_minimal_handle_new_user
-- 033 이후에도 "Database error creating new user" 일 때:
-- 1) SQL Editor 에서 반드시 이 파일 전체를 선택(Ctrl+A) 후 Run 할 것.
--    (앞 10줄만 실행하면 handle_new_user 가 안 바뀌어 계속 실패합니다.)
-- 2) FORCE ROW LEVEL SECURITY 가 켜져 있으면 테이블 소유자도 RLS에 걸릴 수 있어 끕니다.
-- 3) 미니홈 INSERT 가 실패해도 가입은 통과시키고 경고만 남깁니다(로그 확인).
-- =============================================================================

create extension if not exists pgcrypto;

alter table if exists public.profiles no force row level security;
alter table if exists public.user_minihomes no force row level security;

drop trigger if exists trg_profiles_ensure_minihome on public.profiles;

drop trigger if exists trg_profiles_admin_search on public.profiles;
create trigger trg_profiles_admin_search
  before update of display_name on public.profiles
  for each row execute function public.trg_profiles_set_admin_search();

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

  insert into public.profiles (id, display_name, avatar_url, admin_search)
  values (new.id, dn, new.raw_user_meta_data->>'avatar_url', '')
  on conflict (id) do nothing;

  begin
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
  exception when others then
    raise warning 'handle_new_user minihome skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  '가입: profiles 필수. user_minihomes 는 실패 시 경고만(가입은 유지).';

alter function public.handle_new_user() owner to postgres;

grant usage on schema public to supabase_auth_admin;
grant insert, select, update, delete on table public.profiles to supabase_auth_admin;
grant insert, select, update, delete on table public.user_minihomes to supabase_auth_admin;
grant usage, select on all sequences in schema public to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop policy if exists profiles_insert_supabase_auth_admin on public.profiles;
create policy profiles_insert_supabase_auth_admin on public.profiles
  for insert to supabase_auth_admin with check (true);

drop policy if exists user_minihomes_insert_supabase_auth_admin on public.user_minihomes;
create policy user_minihomes_insert_supabase_auth_admin on public.user_minihomes
  for insert to supabase_auth_admin with check (true);

drop policy if exists profiles_select_supabase_auth_admin on public.profiles;
create policy profiles_select_supabase_auth_admin on public.profiles
  for select to supabase_auth_admin using (true);

drop policy if exists user_minihomes_select_supabase_auth_admin on public.user_minihomes;
create policy user_minihomes_select_supabase_auth_admin on public.user_minihomes
  for select to supabase_auth_admin using (true);

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
