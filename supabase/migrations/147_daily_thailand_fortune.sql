-- =============================================================================
-- 147_daily_thailand_fortune.sql
-- 일일 「태국 포춘」— tips 테이블 랜덤 꿀팁 + Bangkok 자정 기준 1일 1회 도토리
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) tips — 포춘용 짧은 문구 (posts 파이프라인에서 시드, 이후 운영이 행 추가 가능)
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

-- 행 비공개(RLS 정책 없음 = 거부). 조회·추가는 SECURITY DEFINER·service_role.

insert into public.tips (body, locale, source_post_id)
select
  left(trim(coalesce(nullif(trim(p.excerpt), ''), p.title)), 600),
  'ko',
  p.id
from public.posts p
where p.moderation_status = 'safe'
  and coalesce(p.author_hidden, false) = false
  and p.category = 'info'
  and p.is_knowledge_tip = true
  and exists (
    select 1
    from public.processed_knowledge pk
    where pk.post_id = p.id
      and pk.published = true
      and pk.board_target = 'tips_board'
  )
  and char_length(trim(coalesce(nullif(trim(p.excerpt), ''), p.title))) >= 10
  and not exists (select 1 from public.tips t where t.source_post_id = p.id);

-- ---------------------------------------------------------------------------
-- 2) profiles — 마지막 포춘 참여일 (Bangkok 달력 기준)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_fortune_date date null;

comment on column public.profiles.last_fortune_date is
  'Asia/Bangkok 기준 달력 날짜에 일일 포춘·도토리 출석 완료 시 설정.';

-- ---------------------------------------------------------------------------
-- 3) 보상액 — site_settings (앱 하드코딩 없음)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values ('economy.daily_fortune_dotori', '{"amount": 10}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 4) dotori_events.event_type 확장
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
-- 5) RPC — 단일 트랜잭션: 프로필 잠금 → 중복 검사 → 팁 추첨 → 이벤트·프로필 갱신
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
    dotori_balance = p.dotori_balance + v_reward,
    style_score_total = p.style_score_total + v_reward
  where p.id = uid
  returning p.dotori_balance into v_bal;

  return jsonb_build_object(
    'ok', true,
    'reason', 'GRANTED',
    'tip', jsonb_build_object(
      'id', v_tip_id,
      'body', v_tip_body,
      'sourcePostId', v_source
    ),
    'amount', v_reward,
    'dotori_balance', coalesce(v_bal, 0),
    'bangkok_date', v_day
  );
end;
$$;

comment on function public.claim_daily_thailand_fortune(text) is
  '로그인 사용자만: Bangkok 자정 기준 일 1회 tips 랜덤 노출 + 도토리(site_settings).';

alter function public.claim_daily_thailand_fortune(text) owner to postgres;

grant execute on function public.claim_daily_thailand_fortune(text) to authenticated;

notify pgrst, 'reload_schema';

commit;
