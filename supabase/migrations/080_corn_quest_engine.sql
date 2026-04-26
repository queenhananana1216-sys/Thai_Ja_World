-- quest migration
-- =============================================================================
-- 094_corn_quest_engine.sql
-- 옥수수 경제 확장 + 자동 퀘스트(일/주/월/이벤트) + 강화형 악용 방지
-- =============================================================================

-- 사용자 노출명 계약: style_score_total 은 "옥수수 잔액"으로 사용한다.
comment on column public.profiles.style_score_total is
  '사용자 노출명: 옥수수 잔액(구 style score/point).';

alter table public.profiles
  add column if not exists quest_risk_level int not null default 1,
  add column if not exists quest_last_reward_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_quest_risk_level_range'
  ) then
    alter table public.profiles
      add constraint profiles_quest_risk_level_range
      check (quest_risk_level between 1 and 5);
  end if;
end $$;

create table if not exists public.quest_definitions (
  id uuid primary key default gen_random_uuid(),
  quest_code text not null unique,
  title_ko text not null,
  title_th text not null,
  description_ko text,
  description_th text,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'event')),
  event_type text not null,
  goal_count int not null default 1 check (goal_count > 0 and goal_count <= 100000),
  reward_corn int not null check (reward_corn > 0 and reward_corn <= 500000),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_definitions_conditions_object check (jsonb_typeof(conditions) = 'object')
);

create index if not exists idx_quest_definitions_active_period
  on public.quest_definitions (active, period_type, starts_at desc);

drop trigger if exists trg_quest_definitions_updated_at on public.quest_definitions;
create trigger trg_quest_definitions_updated_at
  before update on public.quest_definitions
  for each row execute function public.set_updated_at();

create table if not exists public.quest_instances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  definition_id uuid not null references public.quest_definitions(id) on delete cascade,
  quest_code text not null,
  period_key text not null,
  goal_count int not null check (goal_count > 0 and goal_count <= 100000),
  progress_count int not null default 0 check (progress_count >= 0 and progress_count <= 100000),
  reward_corn int not null check (reward_corn > 0 and reward_corn <= 500000),
  status text not null default 'active' check (status in ('active', 'completed', 'claimed', 'held', 'expired')),
  completed_at timestamptz,
  rewarded_at timestamptz,
  held_at timestamptz,
  hold_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_instances_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint quest_instances_uniq unique (profile_id, quest_code, period_key)
);

create index if not exists idx_quest_instances_profile_status
  on public.quest_instances (profile_id, status, created_at desc);
create index if not exists idx_quest_instances_settle
  on public.quest_instances (status, rewarded_at, completed_at);

drop trigger if exists trg_quest_instances_updated_at on public.quest_instances;
create trigger trg_quest_instances_updated_at
  before update on public.quest_instances
  for each row execute function public.set_updated_at();

create table if not exists public.quest_progress_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  amount int not null default 1 check (amount > 0 and amount <= 100000),
  source text not null default 'app',
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint quest_progress_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_quest_progress_events_profile_date
  on public.quest_progress_events (profile_id, occurred_at desc);
create index if not exists idx_quest_progress_events_event
  on public.quest_progress_events (event_type, occurred_at desc);
create unique index if not exists uq_quest_progress_events_dedupe
  on public.quest_progress_events (dedupe_key)
  where dedupe_key is not null;

create table if not exists public.quest_reward_ledger (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  quest_instance_id uuid not null references public.quest_instances(id) on delete cascade,
  quest_code text not null,
  period_key text not null,
  reward_corn int not null check (reward_corn > 0 and reward_corn <= 500000),
  reward_key text not null unique,
  status text not null default 'granted' check (status in ('granted', 'held', 'cancelled')),
  reason text,
  created_at timestamptz not null default now(),
  constraint quest_reward_ledger_instance_uniq unique (quest_instance_id)
);

create index if not exists idx_quest_reward_ledger_profile_date
  on public.quest_reward_ledger (profile_id, created_at desc);
create index if not exists idx_quest_reward_ledger_status
  on public.quest_reward_ledger (status, created_at desc);

create table if not exists public.quest_reward_holds (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  quest_instance_id uuid not null references public.quest_instances(id) on delete cascade,
  hold_reason text not null,
  risk_score int not null default 0,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint quest_reward_holds_instance_uniq unique (quest_instance_id)
);

create index if not exists idx_quest_reward_holds_status
  on public.quest_reward_holds (review_status, created_at desc);

alter table public.quest_definitions enable row level security;
alter table public.quest_instances enable row level security;
alter table public.quest_progress_events enable row level security;
alter table public.quest_reward_ledger enable row level security;
alter table public.quest_reward_holds enable row level security;

drop policy if exists quest_definitions_select_public on public.quest_definitions;
create policy quest_definitions_select_public on public.quest_definitions
  for select to anon, authenticated
  using (active = true);

drop policy if exists quest_instances_select_own on public.quest_instances;
create policy quest_instances_select_own on public.quest_instances
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists quest_progress_events_select_own on public.quest_progress_events;
create policy quest_progress_events_select_own on public.quest_progress_events
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists quest_reward_ledger_select_own on public.quest_reward_ledger;
create policy quest_reward_ledger_select_own on public.quest_reward_ledger
  for select to authenticated
  using (profile_id = auth.uid());

create or replace function public.quest_period_key(p_period text, p_target_date date)
returns text
language plpgsql
immutable
as $$
begin
  if p_period = 'daily' then
    return to_char(p_target_date, 'YYYY-MM-DD');
  elsif p_period = 'weekly' then
    return to_char(p_target_date, 'IYYY-"W"IW');
  elsif p_period = 'monthly' then
    return to_char(p_target_date, 'YYYY-MM');
  end if;
  return to_char(p_target_date, 'YYYYMMDD');
end;
$$;

create or replace function public.quest_spawn_base_instances(
  p_target_date date default current_date,
  p_profile_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int := 0;
begin
  insert into public.quest_instances (
    profile_id,
    definition_id,
    quest_code,
    period_key,
    goal_count,
    reward_corn,
    status,
    metadata
  )
  select
    p.id,
    q.id,
    q.quest_code,
    public.quest_period_key(q.period_type, p_target_date),
    q.goal_count,
    q.reward_corn,
    'active',
    jsonb_build_object(
      'period_type', q.period_type,
      'spawned_for', p_target_date
    )
  from public.profiles p
  join public.quest_definitions q
    on q.active = true
   and q.period_type in ('daily', 'weekly', 'monthly')
   and q.starts_at <= now()
   and (q.ends_at is null or q.ends_at > now())
  where (p_profile_id is null or p.id = p_profile_id)
    and (p.banned_until is null or p.banned_until <= now())
  on conflict (profile_id, quest_code, period_key) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.quest_create_event_quest(
  p_quest_code text,
  p_title_ko text,
  p_title_th text,
  p_event_type text,
  p_goal_count int default 1,
  p_reward_corn int default 20,
  p_starts_at timestamptz default now(),
  p_ends_at timestamptz default now() + interval '2 days',
  p_conditions jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := nullif(trim(p_quest_code), '');
  v_def_id uuid;
  v_period_key text;
begin
  if v_code is null then
    raise exception 'QUEST_CODE_REQUIRED';
  end if;
  if p_goal_count <= 0 or p_reward_corn <= 0 then
    raise exception 'QUEST_INVALID_PAYLOAD';
  end if;

  insert into public.quest_definitions (
    quest_code, title_ko, title_th, period_type, event_type, goal_count, reward_corn, starts_at, ends_at, conditions, active
  )
  values (
    v_code,
    coalesce(nullif(trim(p_title_ko), ''), v_code),
    coalesce(nullif(trim(p_title_th), ''), v_code),
    'event',
    p_event_type,
    p_goal_count,
    p_reward_corn,
    p_starts_at,
    p_ends_at,
    coalesce(p_conditions, '{}'::jsonb),
    true
  )
  on conflict (quest_code) do update
    set title_ko = excluded.title_ko,
        title_th = excluded.title_th,
        event_type = excluded.event_type,
        goal_count = excluded.goal_count,
        reward_corn = excluded.reward_corn,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at,
        conditions = excluded.conditions,
        active = true
  returning id into v_def_id;

  v_period_key := public.quest_period_key('event', (p_starts_at at time zone 'UTC')::date) || ':' || substr(md5(v_code), 1, 8);

  insert into public.quest_instances (
    profile_id,
    definition_id,
    quest_code,
    period_key,
    goal_count,
    reward_corn,
    status,
    metadata
  )
  select
    p.id,
    v_def_id,
    v_code,
    v_period_key,
    p_goal_count,
    p_reward_corn,
    'active',
    jsonb_build_object(
      'period_type', 'event',
      'starts_at', p_starts_at,
      'ends_at', p_ends_at
    )
  from public.profiles p
  where (p.banned_until is null or p.banned_until <= now())
  on conflict (profile_id, quest_code, period_key) do nothing;

  return v_def_id;
end;
$$;

create or replace function public.quest_apply_reward(
  p_instance_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst record;
  v_risk int := 0;
  v_days_since_join int := 9999;
  v_daily_reward int := 0;
  v_reward_key text;
begin
  select
    qi.id,
    qi.profile_id,
    qi.quest_code,
    qi.period_key,
    qi.reward_corn,
    qi.status,
    qi.rewarded_at,
    p.created_at as profile_created_at,
    p.activity_grade,
    p.quest_risk_level
  into v_inst
  from public.quest_instances qi
  join public.profiles p on p.id = qi.profile_id
  where qi.id = p_instance_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'QUEST_INSTANCE_NOT_FOUND');
  end if;

  if v_inst.rewarded_at is not null then
    return jsonb_build_object('ok', true, 'reason', 'ALREADY_REWARDED');
  end if;

  if v_inst.status not in ('completed', 'held') then
    return jsonb_build_object('ok', false, 'reason', 'QUEST_NOT_COMPLETED');
  end if;

  v_reward_key := format('%s:%s:%s', v_inst.profile_id, v_inst.quest_code, v_inst.period_key);

  if exists (select 1 from public.quest_reward_ledger where reward_key = v_reward_key) then
    return jsonb_build_object('ok', true, 'reason', 'LEDGER_EXISTS');
  end if;

  if v_inst.profile_created_at is not null then
    v_days_since_join := greatest(0, floor(extract(epoch from (now() - v_inst.profile_created_at)) / 86400)::int);
  end if;

  select coalesce(sum(reward_corn), 0)
    into v_daily_reward
  from public.quest_reward_ledger
  where profile_id = v_inst.profile_id
    and status = 'granted'
    and created_at::date = current_date;

  if v_days_since_join < 7 then
    v_risk := v_risk + 40;
  end if;
  if coalesce(v_inst.activity_grade, 1) <= 1 then
    v_risk := v_risk + 25;
  end if;
  if coalesce(v_inst.quest_risk_level, 1) >= 4 then
    v_risk := v_risk + 30;
  end if;
  if v_daily_reward >= 80 then
    v_risk := v_risk + 40;
  end if;
  if v_inst.reward_corn >= 100 then
    v_risk := v_risk + 20;
  end if;

  if v_risk >= 70 and not p_force then
    update public.quest_instances
      set status = 'held',
          held_at = coalesce(held_at, now()),
          hold_reason = 'ANTI_ABUSE_REVIEW'
    where id = v_inst.id;

    insert into public.quest_reward_ledger (
      profile_id, quest_instance_id, quest_code, period_key, reward_corn, reward_key, status, reason
    )
    values (
      v_inst.profile_id,
      v_inst.id,
      v_inst.quest_code,
      v_inst.period_key,
      v_inst.reward_corn,
      v_reward_key,
      'held',
      'ANTI_ABUSE_REVIEW'
    );

    insert into public.quest_reward_holds (
      profile_id, quest_instance_id, hold_reason, risk_score
    )
    values (
      v_inst.profile_id,
      v_inst.id,
      'ANTI_ABUSE_REVIEW',
      v_risk
    )
    on conflict (quest_instance_id) do nothing;

    return jsonb_build_object('ok', false, 'reason', 'HOLD', 'risk_score', v_risk);
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  update public.profiles
    set style_score_total = style_score_total + v_inst.reward_corn,
        quest_last_reward_at = now()
  where id = v_inst.profile_id;

  insert into public.quest_reward_ledger (
    profile_id, quest_instance_id, quest_code, period_key, reward_corn, reward_key, status, reason
  )
  values (
    v_inst.profile_id,
    v_inst.id,
    v_inst.quest_code,
    v_inst.period_key,
    v_inst.reward_corn,
    v_reward_key,
    'granted',
    'QUEST_COMPLETED'
  );

  update public.quest_instances
    set status = 'claimed',
        rewarded_at = now(),
        hold_reason = null
  where id = v_inst.id;

  return jsonb_build_object('ok', true, 'reason', 'GRANTED', 'amount', v_inst.reward_corn);
end;
$$;

create or replace function public.quest_record_progress(
  p_profile_id uuid,
  p_event_type text,
  p_amount int default 1,
  p_source text default 'app',
  p_dedupe_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spawned int := 0;
  v_updated int := 0;
  v_settled int := 0;
  v_row record;
begin
  if p_profile_id is null then
    return jsonb_build_object('ok', false, 'reason', 'PROFILE_REQUIRED');
  end if;
  if nullif(trim(p_event_type), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'EVENT_REQUIRED');
  end if;
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_AMOUNT');
  end if;

  if p_dedupe_key is not null and exists (
    select 1 from public.quest_progress_events where dedupe_key = p_dedupe_key
  ) then
    return jsonb_build_object('ok', true, 'reason', 'DUPLICATE_EVENT');
  end if;

  insert into public.quest_progress_events (
    profile_id, event_type, amount, source, dedupe_key, metadata
  )
  values (
    p_profile_id,
    trim(p_event_type),
    p_amount,
    coalesce(nullif(trim(p_source), ''), 'app'),
    nullif(trim(p_dedupe_key), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );

  v_spawned := public.quest_spawn_base_instances(current_date, p_profile_id);

  update public.quest_instances qi
    set progress_count = least(qi.goal_count, qi.progress_count + p_amount),
        status = case
          when qi.status = 'active' and qi.progress_count + p_amount >= qi.goal_count then 'completed'
          else qi.status
        end,
        completed_at = case
          when qi.status = 'active' and qi.progress_count + p_amount >= qi.goal_count then now()
          else qi.completed_at
        end
  from public.quest_definitions qd
  where qi.definition_id = qd.id
    and qi.profile_id = p_profile_id
    and qd.active = true
    and qd.event_type = trim(p_event_type)
    and qd.starts_at <= now()
    and (qd.ends_at is null or qd.ends_at > now())
    and qi.status in ('active', 'completed');

  get diagnostics v_updated = row_count;

  for v_row in
    select id
    from public.quest_instances
    where profile_id = p_profile_id
      and status = 'completed'
      and rewarded_at is null
    order by completed_at asc nulls last
    limit 50
  loop
    perform public.quest_apply_reward(v_row.id);
    v_settled := v_settled + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'spawned', v_spawned,
    'updated_instances', v_updated,
    'settled', v_settled
  );
end;
$$;

create or replace function public.quest_settle_completed_rewards(p_limit int default 200)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select id
    from public.quest_instances
    where status = 'completed'
      and rewarded_at is null
    order by completed_at asc nulls last
    limit greatest(1, least(p_limit, 2000))
  loop
    perform public.quest_apply_reward(v_row.id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'settled', v_count);
end;
$$;

insert into public.quest_definitions (
  quest_code,
  title_ko,
  title_th,
  description_ko,
  description_th,
  period_type,
  event_type,
  goal_count,
  reward_corn,
  active
)
values
  (
    'daily_checkin_core',
    '오늘 출석하고 옥수수 받기',
    'เช็กอินวันนี้รับข้าวโพด',
    '오늘 출석 체크를 1회 완료하세요.',
    'เช็กอินให้ครบ 1 ครั้งในวันนี้',
    'daily',
    'daily_checkin',
    1,
    8,
    true
  ),
  (
    'daily_post_core',
    '오늘 글 1개 쓰기',
    'โพสต์วันนี้ 1 ครั้ง',
    '광장 또는 뉴스 댓글로 오늘 활동을 남겨 보세요.',
    'โพสต์หรือคอมเมนต์ข่าวอย่างน้อย 1 ครั้ง',
    'daily',
    'write_post',
    1,
    12,
    true
  ),
  (
    'weekly_reaction_core',
    '이번 주 공감 5회',
    'สัปดาห์นี้กดรีแอคชัน 5 ครั้ง',
    '좋아요/공감 반응을 이번 주 5번 남겨 보세요.',
    'กดรีแอคชันให้ครบ 5 ครั้งภายในสัปดาห์นี้',
    'weekly',
    'send_reaction',
    5,
    24,
    true
  ),
  (
    'monthly_post_streak',
    '이달 작성 6회 챌린지',
    'ชาเลนจ์โพสต์เดือนนี้ 6 ครั้ง',
    '한 달 동안 6회 이상 게시/댓글을 완료하세요.',
    'โพสต์หรือคอมเมนต์ให้ครบ 6 ครั้งภายในเดือนนี้',
    'monthly',
    'write_post',
    6,
    60,
    true
  )
on conflict (quest_code) do update
  set title_ko = excluded.title_ko,
      title_th = excluded.title_th,
      description_ko = excluded.description_ko,
      description_th = excluded.description_th,
      period_type = excluded.period_type,
      event_type = excluded.event_type,
      goal_count = excluded.goal_count,
      reward_corn = excluded.reward_corn,
      active = excluded.active;

alter function public.quest_spawn_base_instances(date, uuid) owner to postgres;
alter function public.quest_create_event_quest(text, text, text, text, int, int, timestamptz, timestamptz, jsonb) owner to postgres;
alter function public.quest_apply_reward(uuid, boolean) owner to postgres;
alter function public.quest_record_progress(uuid, text, int, text, text, jsonb) owner to postgres;
alter function public.quest_settle_completed_rewards(int) owner to postgres;

grant execute on function public.quest_period_key(text, date) to anon, authenticated;
grant execute on function public.quest_record_progress(uuid, text, int, text, text, jsonb) to authenticated, postgres;
grant execute on function public.quest_spawn_base_instances(date, uuid) to postgres;
grant execute on function public.quest_create_event_quest(text, text, text, text, int, int, timestamptz, timestamptz, jsonb) to postgres;
grant execute on function public.quest_apply_reward(uuid, boolean) to postgres;
grant execute on function public.quest_settle_completed_rewards(int) to postgres;
