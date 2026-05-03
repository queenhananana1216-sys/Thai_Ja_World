-- 148_today_dotori_earnings_ranking.sql
-- 서울 달력 기준 당일 dotori_events(노출용 뷰 dotori_logs) 양(+) 합산 랭킹 + 로그인 유저 당일·보유 스냅샷

create or replace view public.dotori_logs as
select
  id,
  profile_id,
  event_type,
  amount,
  created_at
from public.dotori_events;

comment on view public.dotori_logs is
  '도토리 원장 읽기 뷰 — public.dotori_events 와 동일 행. 일일 획득 랭킹 RPC 집계용.';

alter view public.dotori_logs owner to postgres;

-- ---------------------------------------------------------------------------
-- 공개: 당일(Asia/Seoul) 양수 amount 합 TOP N
-- ---------------------------------------------------------------------------
create or replace function public.get_public_today_dotori_earnings_ranking(p_limit int default 5)
returns table (
  rank int,
  profile_id uuid,
  display_name text,
  dotori_earned_today int
)
language sql
stable
security definer
set search_path = public
as $$
  with seoul_today as (
    select (timezone('Asia/Seoul', now()))::date as d
  ),
  agg as (
    select
      e.profile_id,
      sum(case when e.amount > 0 then e.amount else 0 end)::bigint as earned
    from public.dotori_logs e
    cross join seoul_today t
    where (timezone('Asia/Seoul', e.created_at))::date = t.d
    group by e.profile_id
    having sum(case when e.amount > 0 then e.amount else 0 end) > 0
  )
  select
    (row_number() over (order by a.earned desc, a.profile_id asc))::int,
    a.profile_id,
    coalesce(nullif(trim(p.display_name), ''), '익명')::text,
    least(a.earned, 2147483647)::int
  from agg a
  join public.profiles p on p.id = a.profile_id
  order by 1 asc
  limit greatest(1, least(coalesce(p_limit, 5), 20));
$$;

alter function public.get_public_today_dotori_earnings_ranking(int) owner to postgres;
grant execute on function public.get_public_today_dotori_earnings_ranking(int) to anon, authenticated;

comment on function public.get_public_today_dotori_earnings_ranking(int) is
  '서울 자정 기준 당일 dotori_logs 양수 합산 상위 N명(공개 랭킹).';

-- ---------------------------------------------------------------------------
-- 로그인: 오늘 획득 합, 보유 잔액, 당일 순위(strictly greater 수 + 1)
-- ---------------------------------------------------------------------------
create or replace function public.get_viewer_today_dotori_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_day date;
  v_today int;
  v_bal int;
  higher_cnt int;
begin
  if uid is null then
    return null;
  end if;

  v_day := (timezone('Asia/Seoul', now()))::date;

  select coalesce(sum(case when amount > 0 then amount else 0 end), 0)::int
    into v_today
  from public.dotori_logs
  where profile_id = uid
    and (timezone('Asia/Seoul', created_at))::date = v_day;

  select coalesce(dotori_balance, 0)::int
    into v_bal
  from public.profiles
  where id = uid;

  if v_today <= 0 then
    return jsonb_build_object(
      'balance', v_bal,
      'todayEarned', 0,
      'todayRank', null
    );
  end if;

  select count(*)::int
    into higher_cnt
  from (
    select profile_id
    from public.dotori_logs
    where (timezone('Asia/Seoul', created_at))::date = v_day
    group by profile_id
    having sum(case when amount > 0 then amount else 0 end) > v_today
  ) s;

  return jsonb_build_object(
    'balance', v_bal,
    'todayEarned', v_today,
    'todayRank', higher_cnt + 1
  );
end;
$$;

alter function public.get_viewer_today_dotori_stats() owner to postgres;
grant execute on function public.get_viewer_today_dotori_stats() to authenticated;

comment on function public.get_viewer_today_dotori_stats() is
  '로그인 사용자: 서울 당일 도토리 획득 합, profiles.dotori_balance, 당일 획득 순위.';
