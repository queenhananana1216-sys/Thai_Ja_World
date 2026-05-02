-- =============================================================================
-- 141_board_greetings_open_dotori_bonus.sql
-- 가입 인사 게시판(`posts.category = greetings`) 첫 성공 글 — 도토리 5,000 1회 지급
-- 멱등: dotori_events.event_type = greetings_board_open_bonus 는 프로필당 1회
-- =============================================================================

alter table public.profiles
  add column if not exists dotori_balance integer not null default 0;

comment on column public.profiles.dotori_balance is
  '미니홈·포털에서 노출하는 보유 도토리(포인트). style_score_total 과 동일 계열 보상을 반영할 때 함께 증가시킨다.';

-- dotori_events.event_type CHECK 확장
do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'dotori_events'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%event_type%';
  if cname is not null then
    execute format('alter table public.dotori_events drop constraint %I', cname);
  end if;
end $$;

alter table public.dotori_events
  add constraint dotori_events_event_type_check check (event_type in (
    'daily_checkin',
    'write_post',
    'receive_like',
    'guestbook_write',
    'referral',
    'purchase',
    'signup_greeting',
    'admin_grant',
    'greetings_board_open_bonus'
  ));

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
  v_bonus int := 5000;
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
      dotori_balance = dotori_balance + v_bonus
  where id = p_profile_id;

  return jsonb_build_object('ok', true, 'reason', 'GRANTED', 'amount', v_bonus);
end;
$$;

alter function public.grant_greetings_board_open_dotori_bonus(uuid, uuid) owner to postgres;

grant execute on function public.grant_greetings_board_open_dotori_bonus(uuid, uuid) to service_role;

notify pgrst, 'reload_schema';
