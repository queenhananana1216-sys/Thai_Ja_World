-- 149_site_brand_missions_activity.sql
-- 브랜드 표시명 + 활동 로그 + 개인/공동 미션(공개 읽기)

-- 1) 브랜드 — 관리자 API로만 수정(service role)
insert into public.site_settings (key, value)
values ('brand.site_display_name', to_jsonb('태국에, 살자'::text))
on conflict (key) do nothing;

-- 2) 활동 로그 (로그인 유저 본인만 insert/select)
create table if not exists public.user_activity_logs (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null default 'page_view',
  path text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_logs_profile_created
  on public.user_activity_logs (profile_id, created_at desc);

alter table public.user_activity_logs enable row level security;

drop policy if exists user_activity_logs_insert_own on public.user_activity_logs;
create policy user_activity_logs_insert_own on public.user_activity_logs
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists user_activity_logs_select_own on public.user_activity_logs;
create policy user_activity_logs_select_own on public.user_activity_logs
  for select to authenticated
  using (profile_id = auth.uid());

comment on table public.user_activity_logs is '개인화 미션·분석용 — 본인 행만 RLS';

-- 3) 개인 미션 (서울 달력 1일 1행)
create table if not exists public.personal_missions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  mission_date date not null,
  title text not null,
  body text not null,
  cta_href text not null default '/community/boards',
  mission_kind text not null default 'rules_engine',
  created_at timestamptz not null default now(),
  unique (profile_id, mission_date)
);

create index if not exists idx_personal_missions_profile_date
  on public.personal_missions (profile_id, mission_date desc);

alter table public.personal_missions enable row level security;

drop policy if exists personal_missions_select_own on public.personal_missions;
create policy personal_missions_select_own on public.personal_missions
  for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists personal_missions_insert_own on public.personal_missions;
create policy personal_missions_insert_own on public.personal_missions
  for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists personal_missions_update_own on public.personal_missions;
create policy personal_missions_update_own on public.personal_missions
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

comment on table public.personal_missions is '서울 기준 일일 개인화 미션 — 앱 규칙/AI 파이프라인이 upsert';

-- 4) 공동 미션 (anon 읽기)
create table if not exists public.collaborative_missions (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('daily', 'weekly', 'monthly')),
  title text not null,
  body text not null,
  goal_target int not null default 100,
  goal_current int not null default 0,
  reward_dotori int not null default 0,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_collaborative_missions_window
  on public.collaborative_missions (starts_on, ends_on);

alter table public.collaborative_missions enable row level security;

drop policy if exists collaborative_missions_select_public on public.collaborative_missions;
create policy collaborative_missions_select_public on public.collaborative_missions
  for select to anon, authenticated
  using (true);

drop policy if exists collaborative_missions_no_write on public.collaborative_missions;
create policy collaborative_missions_no_write on public.collaborative_missions
  for all to anon, authenticated
  using (false);

comment on table public.collaborative_missions is '일/주/월 공동 목표 — 진행률은 서비스 롤·크론이 갱신';

-- 시드: 당일 창이 열리는 일일 공동 미션 1건(없을 때만)
insert into public.collaborative_missions (scope, title, body, goal_target, goal_current, reward_dotori, starts_on, ends_on)
select
  'daily',
  '오늘 함께 글 100개',
  '광장·게시판에 짧은 글이라도 올려 커뮤니티 피드를 살려 주세요. (진행률은 운영 집계로 반영됩니다)',
  100,
  0,
  500,
  (timezone('Asia/Seoul', now()))::date,
  (timezone('Asia/Seoul', now()))::date
where not exists (
  select 1 from public.collaborative_missions c
  where c.scope = 'daily'
    and c.starts_on = (timezone('Asia/Seoul', now()))::date
);
