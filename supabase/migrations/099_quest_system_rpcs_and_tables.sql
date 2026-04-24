-- =============================================================================
-- 099_quest_system_rpcs_and_tables.sql
-- 일일 퀘스트: quest_definitions / quest_instances, 크론 RPC·진행/정산
-- (앱: src/lib/quests/runQuestCronCycle.ts, app/api/cron/quests, app/api/quests)
-- 보상: profiles.style_score_total (도토리) + public.dotori_events(고정) 기록
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Quest definitions & instances
-- -----------------------------------------------------------------------------

create table if not exists public.quest_definitions (
  quest_code text primary key,
  title_ko text not null,
  title_th text not null,
  period_type text not null check (period_type in ('daily', 'event', 'one_time')),
  event_type text not null,
  default_goal int not null check (default_goal > 0 and default_goal <= 1000),
  default_reward_corn int not null check (default_reward_corn between 0 and 5000),
  conditions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_base_daily boolean not null default false
);

comment on table public.quest_definitions is
  '퀘스트 정의. 크론/이벤트 퀘스트는 quest_create_event_quest 로 upsert.';

create table if not exists public.quest_instances (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quest_code text not null references public.quest_definitions (quest_code) on delete restrict,
  period_key text not null,
  goal_count int not null check (goal_count > 0),
  progress_count int not null default 0,
  reward_corn int not null,
  status text not null
    check (status in ('active', 'completed', 'claimed', 'held')),
  hold_reason text,
  completed_at timestamptz,
  rewarded_at timestamptz,
  held_at timestamptz,
  instance_conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_quest_instances_profile_code_period
  on public.quest_instances (profile_id, quest_code, period_key);

create index if not exists idx_quest_instances_profile_status
  on public.quest_instances (profile_id, status, created_at desc);

create index if not exists idx_quest_instances_code_period
  on public.quest_instances (quest_code, period_key);

-- 진행 dedupe: 동일 profile + dedupe_key = 한 번만 카운트
create table if not exists public.quest_progress_dedupes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, dedupe_key)
);

create index if not exists idx_quest_dedupes_created on public.quest_progress_dedupes (created_at desc);

create table if not exists public.quest_reward_ledger (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quest_instance_id uuid not null references public.quest_instances (id) on delete cascade,
  reward_corn int not null,
  status text not null check (status in ('granted', 'void')),
  created_at timestamptz not null default now()
);

create index if not exists idx_quest_ledger_profile_created
  on public.quest_reward_ledger (profile_id, created_at desc);

create table if not exists public.quest_reward_holds (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  quest_instance_id uuid not null references public.quest_instances (id) on delete cascade,
  hold_reason text,
  risk_score int,
  review_status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_quest_holds_status_created
  on public.quest_reward_holds (review_status, created_at desc);

-- -----------------------------------------------------------------------------
-- 1. RLS: 사용자는 본인 인스턴스 + 활성 정의 읽기만
-- -----------------------------------------------------------------------------

alter table public.quest_definitions enable row level security;
alter table public.quest_instances enable row level security;
alter table public.quest_progress_dedupes enable row level security;
alter table public.quest_reward_ledger enable row level security;
alter table public.quest_reward_holds enable row level security;

drop policy if exists quest_definitions_select_active on public.quest_definitions;
create policy quest_definitions_select_active
  on public.quest_definitions
  for select
  to authenticated
  using (is_active = true);

drop policy if exists quest_instances_select_own on public.quest_instances;
create policy quest_instances_select_own
  on public.quest_instances
  for select
  to authenticated
  using (profile_id = auth.uid());

-- 서버(service)·크론이 직접 쓰지 않음(전부 RPC) — insert/update 없음
drop policy if exists quest_ledger_no_access on public.quest_reward_ledger;
create policy quest_ledger_no_access
  on public.quest_reward_ledger
  for all
  to authenticated
  using (false);

drop policy if exists quest_holds_no_access on public.quest_reward_holds;
create policy quest_holds_no_access
  on public.quest_reward_holds
  for all
  to authenticated
  using (false);

drop policy if exists quest_dedupes_no_access on public.quest_progress_dedupes;
create policy quest_dedupes_no_access
  on public.quest_progress_dedupes
  for all
  to authenticated
  using (false);

-- -----------------------------------------------------------------------------
-- 2. dotori_events: quest_reward 보상 유형(멱등/정산용) 허용
-- -----------------------------------------------------------------------------

-- 기존 CHECK 가 있으면 제거하고 확장(마이그레이션 068,070 계열)
alter table public.dotori_events
  drop constraint if exists dotori_events_event_type_check;

alter table public.dotori_events
  add constraint dotori_events_event_type_check
  check (event_type in (
    'daily_checkin', 'write_post', 'receive_like', 'send_reaction',
    'guestbook_write', 'referral', 'purchase', 'signup_greeting', 'admin_grant',
    'quest_reward'
  ));

-- daily_cap 계열에서 quest_reward 는 일한도에 포함시키지 않음 (정산 쪽에서 이미 1회)
-- dotori_reward_activity는 quest_reward 를 호출하지 않음(별도 RPC)

-- -----------------------------------------------------------------------------
-- 3. 시드: 기본 일일 퀘스트(비이벤트) — is_base_daily
-- -----------------------------------------------------------------------------

insert into public.quest_definitions (
  quest_code, title_ko, title_th, period_type, event_type,
  default_goal, default_reward_corn, is_base_daily, conditions, is_active
) values
  (
    'daily_social_write_v1', '광장·뉴스에 한 번 남기기', 'เซ็งชุมชนหรือข่าวสักครั้ง',
    'daily', 'write_post', 1, 4, true, '{}', true
  ),
  (
    'daily_social_react_v1', '하트/공감 2번', 'กดหัวใจหรือโหวต 2 ครั้ง',
    'daily', 'send_reaction', 2, 3, true, '{}', true
  ),
  (
    'daily_social_checkin_v1', '스타일 상점 출석체크', 'เช็กอินร้านสไตล์',
    'daily', 'daily_checkin', 1, 3, true, '{}', true
  )
on conflict (quest_code) do update set
  title_ko = excluded.title_ko,
  title_th = excluded.title_th,
  event_type = excluded.event_type,
  default_goal = excluded.default_goal,
  default_reward_corn = excluded.default_reward_corn,
  is_base_daily = excluded.is_base_daily,
  is_active = excluded.is_active;

-- -----------------------------------------------------------------------------
-- 4. Helpers
-- -----------------------------------------------------------------------------

create or replace function public._quest_period_utc_ymd()
returns text
language sql
stable
as $$
  select to_char (timezone('utc', now())::date, 'YYYY-MM-DD');
$$;

create or replace function public._quest_caller_allows(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  role_claim text;
  jwt_role text;
begin
  if p_profile_id is null then
    raise exception 'INVALID_PROFILE' using errcode = 'P0001';
  end if;
  role_claim := nullif(
    (current_setting('request.jwt.claims', true))::jsonb->>'role', ''
  );
  begin
    jwt_role := auth.jwt() ->> 'role';
  exception
    when others then
      jwt_role := null;
  end;
  if coalesce(role_claim, '') in ('service_role', 'supabase_service_role')
     or coalesce(jwt_role, '') in ('service_role', 'supabase_service_role') then
    return;
  end if;
  if auth.uid() is not null and auth.uid() = p_profile_id then
    return;
  end if;
  raise exception 'FORBIDDEN' using errcode = 'P0001';
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. quest_record_progress (서비스 롤 또는 본인 JWT)
-- -----------------------------------------------------------------------------

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
  p text := nullif(trim(coalesce(p_event_type, '')), '');
  n int := greatest(1, least(coalesce(p_amount, 1), 200));
  row_inst record;
  def record;
  meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  ymd text := public._quest_period_utc_ymd();
  news_id uuid;
  event_key text;
  new_pc int;
begin
  perform public._quest_caller_allows(p_profile_id);

  if p is null then
    return jsonb_build_object('ok', false, 'reason', 'NO_EVENT');
  end if;

  if p_dedupe_key is not null and length(trim(p_dedupe_key)) > 0 then
    begin
      insert into public.quest_progress_dedupes (profile_id, dedupe_key)
      values (p_profile_id, left(trim(p_dedupe_key), 256));
    exception
      when unique_violation then
        return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'deduped');
    end;
  end if;

  for row_inst in
    select qi.*
    from public.quest_instances qi
    inner join public.quest_definitions d on d.quest_code = qi.quest_code and d.is_active
    where qi.profile_id = p_profile_id
      and qi.status = 'active'
      and d.event_type = p
      and qi.progress_count < qi.goal_count
  loop
    select * into def
    from public.quest_definitions
    where quest_code = row_inst.quest_code;

    -- 뉴스 이벤트: 인스턴스 instance_conditions.processed_news_id 가 메타와 일치할 때만
    if (row_inst.instance_conditions ? 'processed_news_id') is true then
      news_id := (meta->>'processed_news_id')::uuid;
      if news_id is null
         or (row_inst.instance_conditions->>'processed_news_id') is distinct from news_id::text
      then
        continue;
      end if;
    end if;

    if def.period_type = 'daily' and row_inst.period_key is distinct from ymd then
      continue;
    end if;

    if def.period_type = 'event' then
      event_key := coalesce(
        nullif(trim(def.conditions->>'target_date'), ''),
        ymd
      );
      if row_inst.period_key is distinct from event_key then
        continue;
      end if;
    end if;

    new_pc := least(row_inst.goal_count, row_inst.progress_count + n);
    update public.quest_instances
    set
      progress_count = new_pc,
      status = case
        when new_pc >= row_inst.goal_count then 'completed'
        else row_inst.status
      end,
      completed_at = case
        when new_pc >= row_inst.goal_count and row_inst.completed_at is null then now()
        else row_inst.completed_at
      end,
      updated_at = now()
    where id = row_inst.id;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

alter function public.quest_record_progress(uuid, text, int, text, text, jsonb) owner to postgres;
revoke all on function public.quest_record_progress(uuid, text, int, text, text, jsonb) from public;
grant execute on function public.quest_record_progress(uuid, text, int, text, text, jsonb)
  to service_role, postgres, authenticated;

-- -----------------------------------------------------------------------------
-- 6. quest_spawn_base_instances(UTC YMD) — active 유저에만 멱등 삽입
-- -----------------------------------------------------------------------------

create or replace function public.quest_spawn_base_instances(
  p_target_date text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  d text := nullif(trim(p_target_date), '');
  inserted int := 0;
begin
  if d is null or d !~ '^\d{4}-\d{2}-\d{2}$' then
    d := public._quest_period_utc_ymd();
  end if;

  insert into public.quest_instances (
    profile_id, quest_code, period_key, goal_count, progress_count, reward_corn, status, instance_conditions
  )
  select
    a.profile_id,
    ddef.quest_code,
    d,
    ddef.default_goal,
    0,
    ddef.default_reward_corn,
    'active',
    '{}'::jsonb
  from public.quest_definitions ddef
  cross join lateral (
    select distinct p.author_id as profile_id
    from public.posts p
    where p.created_at > now() - interval '14 days'
    union
    select distinct e.profile_id
    from public.dotori_events e
    where e.created_at > now() - interval '14 days'
    union
    select distinct u.id as profile_id
    from public.profiles u
    where coalesce(u.is_staff, false) = false
      and u.created_at > now() - interval '3 days'
  ) a
  where ddef.is_active
    and ddef.is_base_daily
  on conflict (profile_id, quest_code, period_key) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

alter function public.quest_spawn_base_instances(text) owner to postgres;
revoke all on function public.quest_spawn_base_instances(text) from public;
grant execute on function public.quest_spawn_base_instances(text) to service_role, postgres;

-- -----------------------------------------------------------------------------
-- 7. quest_create_event_quest
-- -----------------------------------------------------------------------------

create or replace function public.quest_create_event_quest(
  p_quest_code text,
  p_title_ko text,
  p_title_th text,
  p_event_type text,
  p_goal_count int,
  p_reward_corn int,
  p_conditions jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  code text := nullif(trim(p_quest_code), '');
  cond jsonb := coalesce(p_conditions, '{}'::jsonb);
  tdate text := coalesce(nullif(trim(cond->>'target_date'), ''), public._quest_period_utc_ymd());
  g int := greatest(1, least(coalesce(p_goal_count, 1), 500));
  r int := greatest(0, least(coalesce(p_reward_corn, 0), 5000));
  et text := nullif(trim(coalesce(p_event_type, '')), '');
begin
  if code is null or et is null then
    return;
  end if;

  insert into public.quest_definitions (
    quest_code, title_ko, title_th, period_type, event_type,
    default_goal, default_reward_corn, conditions, is_base_daily, is_active
  ) values (
    code, coalesce(p_title_ko, code), coalesce(p_title_th, code), 'event', et,
    g, r, cond, false, true
  )
  on conflict (quest_code) do update set
    title_ko = excluded.title_ko,
    title_th = excluded.title_th,
    event_type = excluded.event_type,
    default_goal = excluded.default_goal,
    default_reward_corn = excluded.default_reward_corn,
    conditions = excluded.conditions,
    is_active = true;

  insert into public.quest_instances (
    profile_id, quest_code, period_key, goal_count, progress_count, reward_corn, status, instance_conditions
  )
  select
    a.profile_id,
    code,
    tdate,
    g,
    0,
    r,
    'active',
    case
      when (cond ? 'processed_news_id')
      then jsonb_build_object('processed_news_id', cond->>'processed_news_id')
      else '{}'::jsonb
    end
  from (
    select distinct p.author_id as profile_id
    from public.posts p
    where p.created_at > now() - interval '14 days'
    union
    select distinct e.profile_id
    from public.dotori_events e
    where e.created_at > now() - interval '14 days'
  ) a
  on conflict (profile_id, quest_code, period_key) do nothing;
end;
$$;

alter function public.quest_create_event_quest(text, text, text, text, int, int, jsonb) owner to postgres;
revoke all on function public.quest_create_event_quest(text, text, text, text, int, int, jsonb) from public;
grant execute on function public.quest_create_event_quest(text, text, text, text, int, int, jsonb) to service_role, postgres;

-- -----------------------------------------------------------------------------
-- 8. quest_settle_completed_rewards — style_score_total + quest_reward
-- -----------------------------------------------------------------------------

create or replace function public.quest_settle_completed_rewards(
  p_limit int default 200
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cap int := greatest(20, least(coalesce(p_limit, 200), 5000));
  settled int := 0;
  r record;
begin
  for r in
    select qi.id, qi.profile_id, qi.reward_corn
    from public.quest_instances qi
    where qi.status = 'completed'
      and qi.rewarded_at is null
    order by qi.completed_at nulls first, qi.created_at asc
    limit cap
    for update skip locked
  loop
    if r.reward_corn < 0 then
      update public.quest_instances
      set status = 'held', hold_reason = 'invalid_reward', held_at = now(), updated_at = now()
      where id = r.id;
      continue;
    end if;

    if r.reward_corn = 0 then
      update public.quest_instances
      set status = 'claimed', rewarded_at = now(), updated_at = now()
      where id = r.id;
      insert into public.quest_reward_ledger (profile_id, quest_instance_id, reward_corn, status)
      values (r.profile_id, r.id, 0, 'granted');
      settled := settled + 1;
      continue;
    end if;

    perform set_config('app.profile_style_guard_bypass', '1', true);

    insert into public.dotori_events (profile_id, event_type, amount)
    values (r.profile_id, 'quest_reward', r.reward_corn);

    update public.profiles
    set style_score_total = coalesce(style_score_total, 0) + r.reward_corn
    where id = r.profile_id;

    update public.quest_instances
    set status = 'claimed', rewarded_at = now(), updated_at = now()
    where id = r.id;

    insert into public.quest_reward_ledger (profile_id, quest_instance_id, reward_corn, status)
    values (r.profile_id, r.id, r.reward_corn, 'granted');

    settled := settled + 1;
  end loop;

  return jsonb_build_object('settled', settled);
end;
$$;

alter function public.quest_settle_completed_rewards(int) owner to postgres;
revoke all on function public.quest_settle_completed_rewards(int) from public;
grant execute on function public.quest_settle_completed_rewards(int) to service_role, postgres;
