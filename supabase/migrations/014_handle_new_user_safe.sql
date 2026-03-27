-- =============================================================================
-- 014_handle_new_user_safe — 가입 시 "Database error saving new user" 완화
-- - 이메일 없음(전화 OTP 등)일 때 split_part(NULL, ...) 로 인한 예외 방지
-- - 동일 id 재시도 시 profiles 중복 삽입 완화 (ON CONFLICT DO NOTHING)
-- Supabase SQL Editor 에서도 이 파일 전체 실행 가능
-- =============================================================================

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

-- 일부 Supabase 프로젝트에서 함수 소유자가 달라 RLS 때문에 트리거 INSERT 가 막히는 경우 방지
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
