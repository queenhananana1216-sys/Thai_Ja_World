-- =============================================================================
-- 006_profiles_admin_search_reports — 관리자용 회원 디렉터리 (초성 검색·신고 집계·스태프 플래그)
-- =============================================================================

-- pg_trgm: 부분 문자열 검색·유사도 (Supabase에서 일반적으로 사용 가능)
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- profiles 컬럼
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists admin_search text not null default '';

alter table public.profiles
  add column if not exists is_staff boolean not null default false;

-- 004 를 안 돌린 DB 호환: 벤·모더레이션 컬럼 (뷰·트리거에서 참조)
alter table public.profiles
  add column if not exists banned_until timestamptz,
  add column if not exists ban_reason text,
  add column if not exists moderation_strikes integer not null default 0;

create index if not exists idx_profiles_banned_until on public.profiles (banned_until)
  where banned_until is not null;

comment on column public.profiles.admin_search is
  '표시명 기반 검색 키: 한글 초성 연속 + 공백 + 소문자 표시명(영·태 등). 관리자 목록 ilike/%trgm% 검색용.';
comment on column public.profiles.is_staff is
  'true 인 계정만 관리자 API/화면에서 민감 작업 허용 예정. 일반 사용자는 UPDATE 불가(트리거).';

create index if not exists idx_profiles_admin_search_trgm
  on public.profiles using gin (admin_search gin_trgm_ops);

create index if not exists idx_profiles_is_staff
  on public.profiles (is_staff) where is_staff = true;

-- UTF-8 한 글자(1~4바이트) → 코드포인트 (BMP 위 한글 3바이트)
create or replace function public.utf8_first_codepoint(c text)
returns integer
language plpgsql
immutable
strict
as $$
declare
  b bytea;
  len int;
begin
  if c is null or length(c) < 1 then
    return -1;
  end if;
  c := substr(c, 1, 1);
  b := convert_to(c, 'UTF8');
  len := octet_length(b);
  if len = 1 then
    return get_byte(b, 0);
  elsif len = 2 then
    return ((get_byte(b, 0) & 31) << 6) | (get_byte(b, 1) & 63);
  elsif len = 3 then
    return ((get_byte(b, 0) & 15) << 12) | ((get_byte(b, 1) & 63) << 6) | (get_byte(b, 2) & 63);
  elsif len = 4 then
    return ((get_byte(b, 0) & 7) << 18) | ((get_byte(b, 1) & 63) << 12) | ((get_byte(b, 2) & 63) << 6) | (get_byte(b, 3) & 63);
  end if;
  return -1;
end;
$$;

-- display_name → 초성열 + 소문자 알파벳/숫자 + 공백 구분 검색 토큰
create or replace function public.profile_compute_admin_search(raw text)
returns text
language plpgsql
immutable
as $$
declare
  result text := '';
  i int;
  ch text;
  cp int;
  cho_idx int;
  chosung text[] := array[
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ',
    'ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  lower_ascii text := '';
  c char(1);
begin
  if raw is null or btrim(raw) = '' then
    return '';
  end if;
  for i in 1..char_length(raw) loop
    ch := substr(raw, i, 1);
    cp := public.utf8_first_codepoint(ch);
    if cp between 44032 and 55203 then
      cho_idx := (cp - 44032) / 588;
      if cho_idx between 0 and 18 then
        result := result || chosung[cho_idx + 1];
      end if;
    elsif (ch ~ '[a-zA-Z0-9]') then
      lower_ascii := lower_ascii || lower(ch);
    end if;
  end loop;
  return trim(both ' ' from (result || ' ' || lower_ascii || ' ' || lower(raw)));
end;
$$;

create or replace function public.trg_profiles_set_admin_search()
returns trigger
language plpgsql
as $$
begin
  new.admin_search := public.profile_compute_admin_search(new.display_name);
  return new;
end;
$$;

drop trigger if exists trg_profiles_admin_search on public.profiles;
create trigger trg_profiles_admin_search
  before insert or update of display_name on public.profiles
  for each row execute function public.trg_profiles_set_admin_search();

-- 기존 행 백필
update public.profiles
set admin_search = public.profile_compute_admin_search(display_name)
where admin_search = '' or admin_search is distinct from public.profile_compute_admin_search(display_name);

-- -----------------------------------------------------------------------------
-- is_staff: 일반 사용자가 자신의 플래그를 바꾸지 못하게
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if auth.uid() is null then
    return new;
  end if;
  if new.banned_until is distinct from old.banned_until
     or new.ban_reason is distinct from old.ban_reason
     or new.moderation_strikes is distinct from old.moderation_strikes then
    raise exception 'moderation fields are system-managed' using errcode = '42501';
  end if;
  if new.is_staff is distinct from old.is_staff then
    raise exception 'is_staff is admin-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_moderation on public.profiles;
create trigger trg_profiles_protect_moderation
  before update on public.profiles
  for each row execute function public.protect_profile_moderation_fields();

-- -----------------------------------------------------------------------------
-- 신고 집계 뷰 (프로필·작성 글·작성 댓글 대상)
-- -----------------------------------------------------------------------------
create or replace view public.v_admin_user_report_totals as
select
  p.id as profile_id,
  p.display_name,
  p.admin_search,
  p.is_staff,
  p.banned_until,
  p.moderation_strikes,
  p.created_at,
  (
    select count(*)::bigint
    from public.reports r
    where r.target_type = 'profile'
      and r.target_id = p.id::text
  ) as reports_on_profile,
  (
    select count(*)::bigint
    from public.reports r
    inner join public.posts po
      on r.target_type = 'post'
     and r.target_id = po.id::text
    where po.author_id = p.id
  ) as reports_on_posts,
  (
    select count(*)::bigint
    from public.reports r
    inner join public.comments cm
      on r.target_type = 'comment'
     and r.target_id = cm.id::text
    where cm.author_id = p.id
  ) as reports_on_comments,
  (
    (select count(*)::bigint from public.reports r where r.target_type = 'profile' and r.target_id = p.id::text)
    + (select count(*)::bigint
       from public.reports r
       join public.posts po on r.target_type = 'post' and r.target_id = po.id::text
       where po.author_id = p.id)
    + (select count(*)::bigint
       from public.reports r
       join public.comments cm on r.target_type = 'comment' and r.target_id = cm.id::text
       where cm.author_id = p.id)
  ) as reports_total
from public.profiles p;

comment on view public.v_admin_user_report_totals is
  '관리자 전용 집계. anon/authenticated SELECT 금지 — service_role 로만 조회할 것.';

revoke all on public.v_admin_user_report_totals from public;
revoke all on public.v_admin_user_report_totals from anon;
revoke all on public.v_admin_user_report_totals from authenticated;
grant select on public.v_admin_user_report_totals to service_role;

-- service_role 전용 검색·정렬 (PostgREST or 필터 이슈 회피)
create or replace function public.admin_user_directory_search(
  p_query text default null,
  p_sort_by_reports_first boolean default true,
  p_limit int default 200
)
returns setof public.v_admin_user_report_totals
language sql
volatile
security definer
set search_path = public
as $$
  select v.*
  from public.v_admin_user_report_totals v
  where coalesce(trim(p_query), '') = ''
     or v.display_name ilike '%' || trim(p_query) || '%'
     or v.admin_search ilike '%' || trim(p_query) || '%'
  order by
    case when p_sort_by_reports_first then v.reports_total else 0 end desc,
    v.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.admin_user_directory_search(text, boolean, int) from public;
revoke all on function public.admin_user_directory_search(text, boolean, int) from anon;
revoke all on function public.admin_user_directory_search(text, boolean, int) from authenticated;
grant execute on function public.admin_user_directory_search(text, boolean, int) to service_role;
