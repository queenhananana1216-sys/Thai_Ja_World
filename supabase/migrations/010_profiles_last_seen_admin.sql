-- 마지막 접속 시각(하트비트) + 관리자 디렉터리 정렬·표시

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.last_seen_at is
  '클라이언트 하트비트(touch_profile_last_seen). 관리자 접속 추정용.';

create index if not exists idx_profiles_last_seen_at
  on public.profiles (last_seen_at desc nulls last);

-- 로그인 사용자가 본인 행만 갱신 (보안 정의자)
create or replace function public.touch_profile_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_profile_last_seen() from public;
grant execute on function public.touch_profile_last_seen() to authenticated;
grant execute on function public.touch_profile_last_seen() to service_role;

-- 뷰 컬럼 순서/개수 변경은 CREATE OR REPLACE 로 불가(42P16) → 의존 함수 제거 후 뷰 재생성
drop function if exists public.admin_user_directory_search(text, text, int);
drop function if exists public.admin_user_directory_search(text, boolean, int);

drop view if exists public.v_admin_user_report_totals;

create view public.v_admin_user_report_totals as
select
  p.id as profile_id,
  p.display_name,
  p.admin_search,
  p.is_staff,
  p.banned_until,
  p.moderation_strikes,
  p.created_at,
  p.last_seen_at,
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

create or replace function public.admin_user_directory_search(
  p_query text default null,
  p_sort text default 'reports',
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
    case when lower(trim(coalesce(p_sort, 'reports'))) = 'last_seen'
      then v.last_seen_at end desc nulls last,
    case when lower(trim(coalesce(p_sort, 'reports'))) = 'reports'
      then v.reports_total end desc nulls last,
    v.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.admin_user_directory_search(text, text, int) from public;
revoke all on function public.admin_user_directory_search(text, text, int) from anon;
revoke all on function public.admin_user_directory_search(text, text, int) from authenticated;
grant execute on function public.admin_user_directory_search(text, text, int) to service_role;
