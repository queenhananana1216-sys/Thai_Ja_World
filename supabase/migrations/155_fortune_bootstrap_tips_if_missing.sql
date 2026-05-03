-- =============================================================================
-- 155_fortune_bootstrap_tips_if_missing.sql
-- 원격 DB가 147을 건너뛴 경우: tips·포춘 의존성 보강 후 154와 동일한 자가 치유 RPC 적용
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) tips — 없으면 생성 (147과 동일 DDL)
-- ---------------------------------------------------------------------------
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  locale text not null default 'ko',
  is_active boolean not null default true,
  source_post_id uuid references public.posts (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint tips_body_len_ck check (char_length(trim(body)) between 10 and 600),
  constraint tips_locale_ck check (locale in ('ko', 'th'))
);

create unique index if not exists tips_source_post_uidx
  on public.tips (source_post_id)
  where source_post_id is not null;

create index if not exists idx_tips_active_locale on public.tips (is_active, locale)
  where is_active = true;

comment on table public.tips is
  '일일 포춘·리텐션용 짧은 꿀팁 — 클라이언트 직접 INSERT 없음, RPC·서비스 롤만.';

alter table public.tips enable row level security;

-- ---------------------------------------------------------------------------
-- 2) profiles.last_fortune_date — 없으면 추가
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_fortune_date date null;

-- ---------------------------------------------------------------------------
-- 3) 보상 site_settings
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values ('economy.daily_fortune_dotori', '{"amount": 10}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4) dotori_events — daily_fortune_pick 허용 (147과 동일 패턴)
-- ---------------------------------------------------------------------------
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
    'greetings_board_open_bonus',
    'local_minihome_bgm_youtube',
    'daily_fortune_pick'
  ));

-- ---------------------------------------------------------------------------
-- 5) pipeline_error_events (154)
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_error_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  reason_code text not null,
  message_excerpt text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pipeline_error_events_scope_created
  on public.pipeline_error_events (scope, created_at desc);

comment on table public.pipeline_error_events is
  'API·RPC 실패 스냅샷 — 자가 치유·관측용. 일반 클라이언트 RLS 거부, service_role 만 기록.';

alter table public.pipeline_error_events enable row level security;

revoke all on public.pipeline_error_events from public;
revoke all on public.pipeline_error_events from anon, authenticated;
grant insert, select on public.pipeline_error_events to service_role;

-- ---------------------------------------------------------------------------
-- 6) tips 시드 (154와 동일)
-- ---------------------------------------------------------------------------
insert into public.tips (body, locale, is_active, source_post_id)
select s.body, s.locale, true, null
from (
  values
    (
      'ko',
      '비 오는 날 방콕은 BTS·MRT 환승 시 지하 연결통로를 우선하세요. 우산은 편의점 7-Eleven에서 40~60฿.'
    ),
    (
      'ko',
      '장마철에는 실내 말짱·쇼핑몰 동선으로 일정을 짜면 습기 스트레스가 확 줄어듭니다.'
    ),
    (
      'ko',
      '태국 생활: GrabFood 배달은 비 올 때 대중교통 대신 체력을 아꿔 주는 현지 꿀팁입니다.'
    ),
    (
      'th',
      'วันฝนตกในกรุงเทพฯ แนะนำเดินทางด้วย BTS/MRT และทางเชื่อมในร่มก่อน แล้วค่อยออกสู่ถนน'
    ),
    (
      'th',
      'หน้าฝน: พกร่มเล็กจากเซเว่น ราคาไม่แพง และเลี่ยงน้ำท่วงขังถนนในช่วงฝนหนัก'
    )
) as s(locale, body)
where char_length(trim(s.body)) between 10 and 600
  and not exists (select 1 from public.tips t where t.body = s.body);

-- ---------------------------------------------------------------------------
-- 7) claim_daily_thailand_fortune — auth 백필 + thai_balance (154)
-- ---------------------------------------------------------------------------
create or replace function public.claim_daily_thailand_fortune(p_locale text default 'ko')
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
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

  insert into public.profiles (id, display_name, avatar_url, admin_search)
  select
    u.id,
    left(
      coalesce(
        nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
        case
          when u.email is not null and position('@' in u.email) > 0 then split_part(u.email, '@', 1)
          else null
        end,
        'user'
      ),
      80
    ),
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), ''),
    ''
  from auth.users u
  where u.id = uid
  on conflict (id) do nothing;

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

comment on function public.claim_daily_thailand_fortune(text) is
  'Bangkok 자정 기준 일 1회 tips + THAI. 프로필 누락 시 auth.users 기반 1회 백필.';

alter function public.claim_daily_thailand_fortune(text) owner to postgres;

grant execute on function public.claim_daily_thailand_fortune(text) to authenticated;

notify pgrst, 'reload_schema';

commit;
