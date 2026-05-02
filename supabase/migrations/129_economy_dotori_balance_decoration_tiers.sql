-- =============================================================================
-- 129_economy_dotori_balance_decoration_tiers.sql
-- 도토리 미션 보상 밸런스 + decoration_assets 가격·등급(basic/premium/special)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) 미션 정의 보상 (reward_corn = 도토리·스타일 포인트 동일 계열)
--    일일 10~30 / 주간 100~150 / 월간 300~500
-- -----------------------------------------------------------------------------
update public.quest_definitions q
set reward_corn = v.new_reward,
    updated_at = now()
from (values
  ('daily_checkin_core', 18),
  ('daily_post_core', 26),
  ('daily_local_info_share', 24),
  ('weekly_reaction_core', 125),
  ('monthly_post_streak', 400)
) as v(quest_code, new_reward)
where q.quest_code = v.quest_code;

-- 진행 중·미수령 인스턴스는 정의와 동기화 (과거 스폰 분도 새 경제로 정산)
update public.quest_instances qi
set reward_corn = qd.reward_corn,
    updated_at = now()
from public.quest_definitions qd
where qi.definition_id = qd.id
  and qi.status in ('active', 'completed')
  and qi.rewarded_at is null;

-- -----------------------------------------------------------------------------
-- 2) 주간 미션 테이블 (있을 때만) — 보상을 100~150 밴드 중앙으로
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'weekly_quests'
  ) then
    update public.weekly_quests set reward_dotori = 125;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3) 단건 지급 리스크·일일 누적 리스크 임계 (신규 보상 스케일에 맞춤)
-- -----------------------------------------------------------------------------
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
  -- 하루 누적 지급이 커졌을 때만 가중 (일일·이벤트 다건 완료)
  if v_daily_reward >= 260 then
    v_risk := v_risk + 40;
  end if;
  -- 월간·온보딩 등 고액 단건
  if v_inst.reward_corn >= 220 then
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

alter function public.quest_apply_reward(uuid, boolean) owner to postgres;

-- -----------------------------------------------------------------------------
-- 4) 일일 출석·활동 소액 보상 RPC (일일 미션 밴드와 조화)
-- -----------------------------------------------------------------------------
create or replace function public.dotori_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bonus int := 18;
  already boolean;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select exists(
    select 1 from public.dotori_events
    where profile_id = uid
      and event_type = 'daily_checkin'
      and created_at::date = current_date
  ) into already;

  if already then
    return jsonb_build_object('ok', false, 'reason', 'ALREADY_CHECKED_IN');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (uid, 'daily_checkin', bonus);

  update public.profiles
  set style_score_total = style_score_total + bonus
  where id = uid;

  return jsonb_build_object('ok', true, 'amount', bonus);
end;
$$;

create or replace function public.dotori_reward_activity(
  p_profile_id uuid,
  p_event_type text,
  p_amount int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  daily_cap int := 96;
  today_total int;
begin
  if p_profile_id is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'INVALID_INPUT');
  end if;

  select coalesce(sum(amount), 0) into today_total
  from public.dotori_events
  where profile_id = p_profile_id
    and event_type not in ('daily_checkin', 'purchase', 'signup_greeting', 'admin_grant')
    and created_at::date = current_date;

  if today_total >= daily_cap then
    return jsonb_build_object('ok', false, 'reason', 'DAILY_LIMIT_REACHED');
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  insert into public.dotori_events (profile_id, event_type, amount)
  values (p_profile_id, p_event_type, least(p_amount, daily_cap - today_total));

  update public.profiles
  set style_score_total = style_score_total + least(p_amount, daily_cap - today_total)
  where id = p_profile_id;

  return jsonb_build_object('ok', true, 'amount', least(p_amount, daily_cap - today_total));
end;
$$;

alter function public.dotori_daily_checkin() owner to postgres;
alter function public.dotori_reward_activity(uuid, text, int) owner to postgres;

-- -----------------------------------------------------------------------------
-- 5) decoration_assets: 등급 enum + 도토리 가격
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'decoration_asset_tier') then
    create type public.decoration_asset_tier as enum ('basic', 'premium', 'special');
  end if;
end $$;

alter table public.decoration_assets
  add column if not exists tier public.decoration_asset_tier not null default 'basic',
  add column if not exists price integer not null default 75
    check (price >= 0 and price <= 999999);

comment on column public.decoration_assets.price is
  '미니홈 꾸미기 에셋 도토리 가격(대여·구매 정가). style_shop_items와 별도 카탈로그.';
comment on column public.decoration_assets.tier is
  'basic: 입문 50~100대, premium: 중상급, special: 1500~3000대 고가 싱크·한정 컨셉.';

create index if not exists decoration_assets_tier_active_idx
  on public.decoration_assets (tier, is_active, sort_order);

-- 기존 시드 행 가격·등급 (이름 기준 — 127_minihome_assets 시드와 동일)
update public.decoration_assets set tier = 'basic', price = 55 where name = 'Basic Dark';
update public.decoration_assets set tier = 'basic', price = 62 where name = 'Basic Amber';
update public.decoration_assets set tier = 'basic', price = 58 where name = 'Basic Light';
update public.decoration_assets set tier = 'basic', price = 52 where name = 'Basic Ocean';

update public.decoration_assets set tier = 'premium', price = 320 where name = 'Wood Tone';
update public.decoration_assets set tier = 'premium', price = 380 where name = 'Neon Night';
update public.decoration_assets set tier = 'premium', price = 340 where name = 'Pastel Soft';
update public.decoration_assets set tier = 'premium', price = 360 where name = 'Charcoal BBQ';

update public.decoration_assets set tier = 'basic', price = 68 where name = 'Calm Cafe (Chill NCS)';
update public.decoration_assets set tier = 'basic', price = 72 where name = 'Upbeat Pop (Energy)';
update public.decoration_assets set tier = 'basic', price = 60 where name = 'Traditional Calm';
update public.decoration_assets set tier = 'basic', price = 78 where name = 'Late Night Shop';

update public.decoration_assets set tier = 'basic', price = 65 where name = 'Default Avatar';
update public.decoration_assets set tier = 'basic', price = 72 where name = 'Friendly Chef';
update public.decoration_assets set tier = 'basic', price = 68 where name = 'Street Food Buddy';

-- -----------------------------------------------------------------------------
-- 6) 스페셜 등급 — 고가 싱크 (플레이스홀더 에셋 URL은 추후 교체)
-- -----------------------------------------------------------------------------
insert into public.decoration_assets (
  type, tier, price, name, asset_url, color_code, tags,
  audio_embed_url, audio_source, license_note, sort_order
)
select 'skin_special', 'special'::public.decoration_asset_tier, 2200,
  'Miniroom Custom Skin — Thai Palace Gradient', null,
  'linear-gradient(135deg,#1e3a8a 0%,#fbbf24 45%,#7c2d12 100%)',
  array['premium', 'custom_skin', 'palace', 'royal_thai', 'special_edition']::text[],
  null, null,
  '커스텀 그라데이션 스킨 — 서비스 배포 시 실제 CSS·텍스처로 교체 가능.', 90
where not exists (
  select 1 from public.decoration_assets d where d.name = 'Miniroom Custom Skin — Thai Palace Gradient'
);

insert into public.decoration_assets (
  type, tier, price, name, asset_url, color_code, tags,
  audio_embed_url, audio_source, license_note, sort_order
)
select 'skin_special', 'special'::public.decoration_asset_tier, 2800,
  'Royal Elephant Golden Miniroom', null, '#c9a227',
  array['golden', 'elephant', 'royal_thai', 'limited', 'mania']::text[],
  null, null,
  '태국 왕실·코끼리 모티프 황금 미니룸 — 고가 한정 컨셉.', 91
where not exists (
  select 1 from public.decoration_assets d where d.name = 'Royal Elephant Golden Miniroom'
);

insert into public.decoration_assets (
  type, tier, price, name, asset_url, color_code, tags,
  audio_embed_url, audio_source, license_note, sort_order
)
select 'minime', 'special'::public.decoration_asset_tier, 2600,
  'Limited Animated Minimi — Songkran Splash',
  'https://cdn.pixabay.com/photo/2017/01/31/17/33/cooking-2024691_128.png',
  null,
  array['limited', 'animated', 'festival', 'songkran', 'mania']::text[],
  null, null,
  '애니메이션 미니미 플레이스홀더 — 실서비스 시 스프라이트 시트로 교체.', 92
where not exists (
  select 1 from public.decoration_assets d where d.name = 'Limited Animated Minimi — Songkran Splash'
);

insert into public.decoration_assets (
  type, tier, price, name, asset_url, color_code, tags,
  audio_embed_url, audio_source, license_note, sort_order
)
select 'skin_special', 'special'::public.decoration_asset_tier, 1800,
  'King Rama Memorial Gold Trim', null, '#fde68a',
  array['memorial', 'gold_trim', 'royal_thai', 'collector']::text[],
  null, null,
  '기념 골드 트림 스킨 — 수집가·매니아용.', 93
where not exists (
  select 1 from public.decoration_assets d where d.name = 'King Rama Memorial Gold Trim'
);

notify pgrst, 'reload_schema';
