-- =============================================================================
-- 033_signup_no_admin_search_trigger_on_insert
-- 032 까지 해도 가입 실패 시: profiles BEFORE INSERT 트리거를 아예 빼고,
-- admin_search 는 handle_new_user 안에서만 채움(실패 시 빈 문자열).
-- 이후 닉네임 변경은 기존 trg_profiles_set_admin_search 가 UPDATE 에서 처리.
-- Supabase SQL Editor 전체 실행.
-- =============================================================================

create extension if not exists pgcrypto;

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
  asrch text := '';
begin
  em := new.email;
  dn := nullif(trim(new.raw_user_meta_data->>'display_name'), '');
  if dn is null and em is not null and position('@' in em) > 0 then
    dn := split_part(em, '@', 1);
  end if;
  if dn is null or dn = '' then
    dn := 'user';
  end if;

  begin
    asrch := public.profile_compute_admin_search(dn);
  exception when others then
    asrch := '';
  end;

  insert into public.profiles (id, display_name, avatar_url, admin_search)
  values (new.id, dn, new.raw_user_meta_data->>'avatar_url', asrch)
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
  '가입: profiles(admin_search 인라인) + user_minihomes. INSERT 시 admin_search 트리거 미사용.';

alter function public.handle_new_user() owner to postgres;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
