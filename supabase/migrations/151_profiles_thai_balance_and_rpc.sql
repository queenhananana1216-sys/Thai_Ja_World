-- profiles 경제 잔액: dotori_balance → thai_balance + 의존 RPC 갱신

begin;

alter table public.profiles rename column dotori_balance to thai_balance;

comment on column public.profiles.thai_balance is
  'THAI 포인트 잔액(커뮤니티 경제). 구 dotori_balance.';

-- ---------------------------------------------------------------------------
-- grant_greetings_board_open_dotori_bonus (142와 동일 로직, 컬럼명만 교체)
-- ---------------------------------------------------------------------------
create or replace function public.grant_greetings_board_open_dotori_bonus(
  p_profile_id uuid,
  p_post_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus int := 500;
begin
  if p_profile_id is null or p_post_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  end if;

  perform 1
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if exists (
    select 1
    from public.dotori_events
    where profile_id = p_profile_id
      and event_type = 'greetings_board_open_bonus'
  ) then
    return jsonb_build_object('ok', true, 'reason', 'ALREADY_GRANTED', 'amount', 0);
  end if;

  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and author_id = p_profile_id
      and category = 'greetings'
      and moderation_status = 'safe'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'POST_NOT_ELIGIBLE');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (p_profile_id, 'greetings_board_open_bonus', v_bonus);

  update public.profiles
  set style_score_total = style_score_total + v_bonus,
      thai_balance = thai_balance + v_bonus
  where id = p_profile_id;

  return jsonb_build_object('ok', true, 'reason', 'GRANTED', 'amount', v_bonus);
end;
$$;

alter function public.grant_greetings_board_open_dotori_bonus(uuid, uuid) owner to postgres;

-- ---------------------------------------------------------------------------
-- local_spot_save_minihome_bgm_with_dotori
-- ---------------------------------------------------------------------------
create or replace function public.local_spot_save_minihome_bgm_with_dotori(
  p_local_spot_id uuid,
  p_bgm_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_owner uuid;
  v_old text;
  v_new_raw text := nullif(trim(coalesce(p_bgm_url, '')), '');
  v_old_id text;
  v_new_id text;
  v_canonical text;
  v_charge boolean;
  v_cost int := 100;
  v_bal int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  end if;

  select ls.owner_profile_id, ls.minihome_bgm_url
  into v_owner, v_old
  from public.local_spots ls
  where ls.id = p_local_spot_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'SPOT_NOT_FOUND');
  end if;

  if v_owner is distinct from uid then
    return jsonb_build_object('ok', false, 'reason', 'FORBIDDEN');
  end if;

  v_old_id := public.youtube_extract_video_id(v_old);

  if v_new_raw is null then
    update public.local_spots
    set minihome_bgm_url = null
    where id = p_local_spot_id;

    select p.thai_balance into v_bal
    from public.profiles p
    where p.id = uid;

    return jsonb_build_object(
      'ok', true,
      'charged', false,
      'bgm_url', null,
      'thai_balance', coalesce(v_bal, 0)
    );
  end if;

  v_new_id := public.youtube_extract_video_id(v_new_raw);
  if v_new_id is null then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_YOUTUBE_URL');
  end if;

  v_canonical :=
    'https://www.youtube-nocookie.com/embed/'
    || v_new_id
    || '?enablejsapi=1&playsinline=1&loop=1&playlist='
    || v_new_id;

  v_charge := v_old_id is distinct from v_new_id;

  if v_charge then
    select p.thai_balance into v_bal
    from public.profiles p
    where p.id = uid
    for update;

    if not found then
      return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
    end if;

    if coalesce(v_bal, 0) < v_cost then
      return jsonb_build_object(
        'ok', false,
        'reason', 'INSUFFICIENT_THAI',
        'need', v_cost,
        'have', coalesce(v_bal, 0)
      );
    end if;

    perform set_config('app.profile_style_guard_bypass', '1', true);

    insert into public.dotori_events (profile_id, event_type, amount)
    values (uid, 'local_minihome_bgm_youtube', -v_cost);

    update public.profiles
    set
      thai_balance = thai_balance - v_cost,
      style_score_total = greatest(0, style_score_total - v_cost)
    where id = uid;
  end if;

  update public.local_spots
  set minihome_bgm_url = v_canonical
  where id = p_local_spot_id;

  select p.thai_balance into v_bal
  from public.profiles p
  where p.id = uid;

  return jsonb_build_object(
    'ok', true,
    'charged', v_charge,
    'bgm_url', v_canonical,
    'thai_balance', coalesce(v_bal, 0)
  );
end;
$$;

alter function public.local_spot_save_minihome_bgm_with_dotori(uuid, text) owner to postgres;

-- ---------------------------------------------------------------------------
-- claim_daily_thailand_fortune
-- ---------------------------------------------------------------------------
create or replace function public.claim_daily_thailand_fortune(p_locale text default 'ko')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_day date := (timezone('Asia/Bangkok', now()))::date;
  v_loc text := lower(trim(coalesce(p_locale, 'ko')));
  v_last date;
  v_reward int := 0;
  v_tip_id uuid;
  v_tip_body text;
  v_source uuid;
  v_bal int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'NOT_AUTHENTICATED');
  end if;

  if v_loc not in ('ko', 'th') then
    v_loc := 'ko';
  end if;

  select coalesce((ss.value->>'amount')::int, 0)
  into v_reward
  from public.site_settings ss
  where ss.key = 'economy.daily_fortune_dotori';

  if v_reward <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'CONFIG_INVALID');
  end if;

  select p.last_fortune_date
  into v_last
  from public.profiles p
  where p.id = uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'PROFILE_NOT_FOUND');
  end if;

  if v_last is not null and v_last = v_day then
    return jsonb_build_object(
      'ok', false,
      'reason', 'ALREADY_CLAIMED',
      'bangkok_date', v_day
    );
  end if;

  select x.id, x.body, x.source_post_id
  into v_tip_id, v_tip_body, v_source
  from (
    select
      t.id,
      t.body,
      t.source_post_id,
      case when t.locale = v_loc then 0 else 1 end as pri
    from public.tips t
    where t.is_active
      and (t.locale = v_loc or t.locale = 'ko')
  ) x
  order by x.pri, random()
  limit 1;

  if v_tip_id is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_TIPS');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (uid, 'daily_fortune_pick', v_reward);

  update public.profiles p
  set
    last_fortune_date = v_day,
    thai_balance = p.thai_balance + v_reward,
    style_score_total = p.style_score_total + v_reward
  where p.id = uid
  returning p.thai_balance into v_bal;

  return jsonb_build_object(
    'ok', true,
    'reason', 'GRANTED',
    'tip', jsonb_build_object(
      'id', v_tip_id,
      'body', v_tip_body,
      'sourcePostId', v_source
    ),
    'amount', v_reward,
    'thai_balance', coalesce(v_bal, 0),
    'bangkok_date', v_day
  );
end;
$$;

alter function public.claim_daily_thailand_fortune(text) owner to postgres;

-- ---------------------------------------------------------------------------
-- get_viewer_today_dotori_stats
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

  select coalesce(thai_balance, 0)::int
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

comment on function public.get_viewer_today_dotori_stats() is
  '로그인 사용자: 서울 당일 THAI 적립 합, profiles.thai_balance, 당일 순위.';

notify pgrst, 'reload_schema';

commit;
