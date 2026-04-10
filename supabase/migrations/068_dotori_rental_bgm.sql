-- =============================================================================
-- 068_dotori_rental_bgm.sql
-- 도토리 경제 시스템: 기간제 렌탈, BGM, 카테고리 확장, 활동 보상
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profile_style_unlocks: 기간제 + 장착 상태
-- -----------------------------------------------------------------------------
alter table public.profile_style_unlocks
  add column if not exists expires_at timestamptz,
  add column if not exists equipped boolean not null default false;

comment on column public.profile_style_unlocks.expires_at is
  'null = 영구제, 값 있으면 해당 시점에 만료 (기간제)';

-- -----------------------------------------------------------------------------
-- 2. style_shop_items: 카테고리 확장 + 렌탈 가격 + 미리보기
-- -----------------------------------------------------------------------------
alter table public.style_shop_items
  drop constraint if exists style_shop_items_category_check;

alter table public.style_shop_items
  add constraint style_shop_items_category_check
    check (category in ('room_skin','minimi','bgm','wallpaper','font','profile_frame'));

alter table public.style_shop_items
  add column if not exists rental_days int,
  add column if not exists rental_price int,
  add column if not exists preview_url text;

comment on column public.style_shop_items.rental_days is
  'null = 영구제 전용 아이템, 30/90 등 = 기간제 대여 일수';
comment on column public.style_shop_items.rental_price is
  '기간제 가격 (영구제 price_points보다 저렴)';

-- -----------------------------------------------------------------------------
-- 3. user_minihomes: BGM
-- -----------------------------------------------------------------------------
alter table public.user_minihomes
  add column if not exists bgm_url text,
  add column if not exists bgm_title text;

-- -----------------------------------------------------------------------------
-- 4. active_unlocks 뷰: 만료되지 않은 보유 아이템만
-- -----------------------------------------------------------------------------
create or replace view public.active_unlocks as
select
  u.profile_id,
  u.item_key,
  u.purchased_at,
  u.expires_at,
  u.equipped,
  s.category,
  s.label_ko,
  s.label_th,
  s.payload,
  case
    when u.expires_at is null then null
    else greatest(0, extract(epoch from u.expires_at - now()) / 86400)::int
  end as days_remaining
from public.profile_style_unlocks u
join public.style_shop_items s on s.item_key = u.item_key
where u.expires_at is null or u.expires_at > now();

grant select on public.active_unlocks to authenticated;

-- -----------------------------------------------------------------------------
-- 5. dotori_events: 활동 보상 기록
-- -----------------------------------------------------------------------------
create table if not exists public.dotori_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'daily_checkin','write_post','receive_like',
    'guestbook_write','referral','purchase','signup_greeting','admin_grant'
  )),
  amount int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_dotori_events_profile_date
  on public.dotori_events (profile_id, created_at desc);

create index if not exists idx_dotori_events_profile_type_day
  on public.dotori_events (profile_id, event_type, (created_at::date));

alter table public.dotori_events enable row level security;

drop policy if exists dotori_events_select_own on public.dotori_events;
create policy dotori_events_select_own on public.dotori_events
  for select to authenticated
  using (profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. RPC: 일일 출석 체크인
-- -----------------------------------------------------------------------------
create or replace function public.dotori_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bonus int := 10;
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

-- -----------------------------------------------------------------------------
-- 7. RPC: 활동 보상 (내부 호출용, 일일 한도 50 체크)
-- -----------------------------------------------------------------------------
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
  daily_cap int := 50;
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

-- -----------------------------------------------------------------------------
-- 8. style_purchase_item 교체: 기간제 렌탈 지원
-- -----------------------------------------------------------------------------
create or replace function public.style_purchase_item(
  p_item_key text,
  p_rental boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text := nullif(trim(p_item_key), '');
  it public.style_shop_items%rowtype;
  bal int;
  cost int;
  exp_at timestamptz;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if k is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  select * into it from public.style_shop_items
  where item_key = k and active = true;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  if p_rental then
    if it.rental_days is null or it.rental_price is null then
      raise exception 'RENTAL_NOT_AVAILABLE';
    end if;
    cost := it.rental_price;
    exp_at := now() + (it.rental_days || ' days')::interval;
  else
    cost := it.price_points;
    exp_at := null;
    if exists (
      select 1 from public.profile_style_unlocks u
      where u.profile_id = uid and u.item_key = k and u.expires_at is null
    ) then
      raise exception 'ALREADY_OWNED';
    end if;
  end if;

  select p.style_score_total into bal
  from public.profiles p where p.id = uid for update;

  if bal is null then raise exception 'PROFILE_NOT_FOUND'; end if;
  if bal < cost then raise exception 'INSUFFICIENT_POINTS'; end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  update public.profiles
  set style_score_total = style_score_total - cost
  where id = uid;

  -- 기간제: 기존 만료 아이템 삭제 후 새로 삽입
  if p_rental then
    delete from public.profile_style_unlocks
    where profile_id = uid and item_key = k and expires_at is not null;
  end if;

  insert into public.profile_style_unlocks (profile_id, item_key, expires_at, equipped)
  values (uid, k, exp_at, true)
  on conflict (profile_id, item_key) do update set
    expires_at = excluded.expires_at,
    equipped = true;

  update public.user_minihomes
  set theme = coalesce(theme, '{}'::jsonb) || it.payload
  where owner_id = uid;

  insert into public.dotori_events (profile_id, event_type, amount)
  values (uid, 'purchase', -cost);

  return jsonb_build_object('ok', true, 'spent', cost, 'item_key', k, 'rental', p_rental);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. 만료 아이템 자동 해제 함수 (cron에서 호출)
-- -----------------------------------------------------------------------------
create or replace function public.dotori_expire_items()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  with expired as (
    delete from public.profile_style_unlocks
    where expires_at is not null and expires_at <= now()
    returning profile_id, item_key
  )
  select count(*) into cnt from expired;

  return cnt;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. 새 아이템 시드 (BGM, 배경, 기간제 포함)
-- -----------------------------------------------------------------------------
insert into public.style_shop_items
  (item_key, category, price_points, rental_days, rental_price, label_ko, label_th, payload, sort_order)
values
  ('skin_lavender_dream', 'room_skin', 120, 30, 30, '라벤더 드림 스킨', 'สกินลาเวนเดอร์ดรีม', '{"accent":"#8b5cf6"}'::jsonb, 15),
  ('skin_sunset_thai', 'room_skin', 150, 30, 35, '태국 선셋 스킨', 'สกินพระอาทิตย์ตก', '{"accent":"#ea580c"}'::jsonb, 25),
  ('skin_midnight', 'room_skin', 200, null, null, '미드나잇 스킨 (영구)', 'สกินมิดไนท์ (ถาวร)', '{"accent":"#1e1b4b"}'::jsonb, 35),
  ('wall_bangkok_night', 'wallpaper', 180, 30, 40, '방콕 야경 배경', 'วอลเปเปอร์กรุงเทพยามค่ำ', '{"wallpaper":"/images/walls/bangkok-night.webp"}'::jsonb, 100),
  ('wall_chiangmai_temple', 'wallpaper', 180, 30, 40, '치앙마이 사원 배경', 'วอลเปเปอร์วัดเชียงใหม่', '{"wallpaper":"/images/walls/chiangmai-temple.webp"}'::jsonb, 110),
  ('bgm_summer_breeze', 'bgm', 100, 30, 25, 'Summer Breeze BGM', 'BGM ลมหนาว', '{"bgm_url":"/audio/bgm/summer-breeze.mp3","bgm_title":"Summer Breeze"}'::jsonb, 200),
  ('bgm_thai_chill', 'bgm', 100, 30, 25, 'Thai Chill BGM', 'BGM ชิลไทย', '{"bgm_url":"/audio/bgm/thai-chill.mp3","bgm_title":"Thai Chill"}'::jsonb, 210),
  ('bgm_retro_cy', 'bgm', 250, null, null, 'Retro Cyworld BGM (영구)', 'BGM เรโทรไซเวิลด์ (ถาวร)', '{"bgm_url":"/audio/bgm/retro-cy.mp3","bgm_title":"Retro Cyworld"}'::jsonb, 220),
  ('minimi_penguin', 'minimi', 60, 30, 15, '미니미 · 펭귄', 'มินิมี · เพนกวิน', '{"minimi":"🐧"}'::jsonb, 70),
  ('minimi_unicorn', 'minimi', 80, null, null, '미니미 · 유니콘 (영구)', 'มินิมี · ยูนิคอร์น (ถาวร)', '{"minimi":"🦄"}'::jsonb, 80),
  ('frame_gold', 'profile_frame', 300, 90, 80, '골드 프레임', 'เฟรมทอง', '{"profile_frame":"gold"}'::jsonb, 300)
on conflict (item_key) do nothing;

-- -----------------------------------------------------------------------------
-- 11. 권한
-- -----------------------------------------------------------------------------
alter function public.dotori_daily_checkin() owner to postgres;
alter function public.dotori_reward_activity(uuid, text, int) owner to postgres;
alter function public.dotori_expire_items() owner to postgres;

grant execute on function public.dotori_daily_checkin() to authenticated;
grant execute on function public.dotori_reward_activity(uuid, text, int) to postgres;
grant execute on function public.dotori_expire_items() to postgres;
