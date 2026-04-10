-- =============================================================================
-- 070_dotori_tier_gating.sql
-- 도토리 티어 게이팅: 아이템 3티어(normal/premium/legend) + 활동 등급 + 구매 제한
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. style_shop_items: 티어 + 구매 조건 컬럼
-- -----------------------------------------------------------------------------
alter table public.style_shop_items
  add column if not exists tier text not null default 'normal';

do $$ begin
  alter table public.style_shop_items
    add constraint style_shop_items_tier_check
      check (tier in ('normal','premium','legend'));
exception when duplicate_object then null;
end $$;

alter table public.style_shop_items
  add column if not exists min_days_since_join int not null default 0,
  add column if not exists min_activity_grade int not null default 1;

-- -----------------------------------------------------------------------------
-- 2. profiles: 활동 등급
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists activity_grade int not null default 1,
  add column if not exists activity_grade_updated_at timestamptz;

do $$ begin
  alter table public.profiles
    add constraint profiles_activity_grade_range
      check (activity_grade between 1 and 5);
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 3. 활동 등급 재계산 함수
-- -----------------------------------------------------------------------------
create or replace function public.dotori_recalc_activity_grades()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
  r record;
  new_grade int;
  checkin_days int;
  post_count int;
  gb_count int;
begin
  perform set_config('app.profile_style_guard_bypass', '1', true);

  for r in
    select p.id, p.activity_grade, p.is_staff
    from public.profiles p
  loop
    if r.is_staff then
      continue;
    end if;

    select count(distinct created_at::date) into checkin_days
    from public.dotori_events
    where profile_id = r.id
      and event_type = 'daily_checkin'
      and created_at > now() - interval '30 days';

    select count(*) into post_count
    from public.dotori_events
    where profile_id = r.id
      and event_type = 'write_post'
      and created_at > now() - interval '30 days';

    select count(*) into gb_count
    from public.dotori_events
    where profile_id = r.id
      and event_type = 'guestbook_write'
      and created_at > now() - interval '30 days';

    if checkin_days >= 25 and post_count >= 20 and gb_count >= 10 then
      new_grade := 4;
    elsif checkin_days >= 15 and post_count >= 10 and gb_count >= 5 then
      new_grade := 3;
    elsif checkin_days >= 7 and post_count >= 3 then
      new_grade := 2;
    else
      new_grade := 1;
    end if;

    if new_grade <> r.activity_grade then
      update public.profiles
      set activity_grade = new_grade,
          activity_grade_updated_at = now()
      where id = r.id;
      updated_count := updated_count + 1;
    end if;
  end loop;

  return updated_count;
end;
$$;

alter function public.dotori_recalc_activity_grades() owner to postgres;
grant execute on function public.dotori_recalc_activity_grades() to postgres;

-- -----------------------------------------------------------------------------
-- 4. style_purchase_item 교체: 티어 조건 검증 추가
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
  prof_row record;
  bal int;
  cost int;
  exp_at timestamptz;
  days_since int;
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

  -- 티어 조건 검증
  select
    p.style_score_total,
    p.activity_grade,
    extract(epoch from now() - p.created_at)::int / 86400
  into bal, prof_row.activity_grade, days_since
  from public.profiles p
  where p.id = uid
  for update;

  if bal is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if days_since < it.min_days_since_join then
    raise exception 'TIER_DAYS_NOT_MET';
  end if;

  if prof_row.activity_grade < it.min_activity_grade then
    raise exception 'TIER_GRADE_NOT_MET';
  end if;

  -- 가격 결정
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

  if bal < cost then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  perform set_config('app.profile_style_guard_bypass', '1', true);

  update public.profiles
  set style_score_total = style_score_total - cost
  where id = uid;

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
-- 5. 기존 아이템 티어 배정
-- -----------------------------------------------------------------------------
update public.style_shop_items set tier = 'normal', min_days_since_join = 0, min_activity_grade = 1
where tier = 'normal' and item_key in (
  'skin_rose_garden','skin_ocean_breeze','skin_forest_cy',
  'minimi_cat','minimi_dog','minimi_bear',
  'skin_lavender_dream','skin_sunset_thai',
  'bgm_summer_breeze','bgm_thai_chill',
  'minimi_penguin'
);

update public.style_shop_items set tier = 'normal', min_days_since_join = 0, min_activity_grade = 1
where tier = 'normal' and item_key in ('skin_midnight','wall_bangkok_night','wall_chiangmai_temple','minimi_unicorn','frame_gold');

update public.style_shop_items set tier = 'premium', min_days_since_join = 30, min_activity_grade = 2
where item_key in ('bgm_retro_cy');

-- frame_gold을 premium으로 상향
update public.style_shop_items set tier = 'premium', min_days_since_join = 30, min_activity_grade = 2, price_points = 400
where item_key = 'frame_gold';

-- -----------------------------------------------------------------------------
-- 6. 프리미엄 + 레전드 신규 아이템 시드
-- -----------------------------------------------------------------------------
insert into public.style_shop_items
  (item_key, category, price_points, rental_days, rental_price, label_ko, label_th, payload, sort_order, tier, min_days_since_join, min_activity_grade)
values
  -- PREMIUM
  ('skin_aurora', 'room_skin', 500, 30, 120, '오로라 스킨', 'สกินออโรร่า',
   '{"accent":"#6366f1","wallpaper":"/images/walls/aurora.webp"}'::jsonb,
   36, 'premium', 30, 2),
  ('skin_neon_city', 'room_skin', 600, 30, 140, '네온 시티 스킨', 'สกินนีออนซิตี้',
   '{"accent":"#ec4899"}'::jsonb,
   37, 'premium', 30, 2),
  ('wall_cherry_blossom', 'wallpaper', 400, 30, 100, '체리블라썸 배경', 'วอลเปเปอร์ซากุระ',
   '{"wallpaper":"/images/walls/cherry-blossom.webp"}'::jsonb,
   120, 'premium', 30, 2),
  ('bgm_lofi_cafe', 'bgm', 350, 30, 80, 'Lo-fi 카페 BGM', 'BGM โลไฟคาเฟ่',
   '{"bgm_url":"/audio/bgm/lofi-cafe.mp3","bgm_title":"Lo-fi Cafe"}'::jsonb,
   230, 'premium', 30, 2),
  -- LEGEND (영구제만, 대여 불가)
  ('minimi_wings', 'minimi', 2000, null, null, '날개 미니미', 'มินิมี ปีก',
   '{"minimi":"🪽"}'::jsonb,
   500, 'legend', 90, 3),
  ('minimi_dragon', 'minimi', 3000, null, null, '용 미니미', 'มินิมี มังกร',
   '{"minimi":"🐉"}'::jsonb,
   510, 'legend', 90, 3),
  ('frame_crown', 'profile_frame', 2500, null, null, '왕관 프레임', 'เฟรมมงกุฎ',
   '{"profile_frame":"crown"}'::jsonb,
   520, 'legend', 90, 3),
  ('skin_hologram', 'room_skin', 5000, null, null, '홀로그램 스킨', 'สกินโฮโลแกรม',
   '{"accent":"#06b6d4","wallpaper":"/images/walls/hologram.webp"}'::jsonb,
   530, 'legend', 90, 3)
on conflict (item_key) do nothing;

-- -----------------------------------------------------------------------------
-- 7. 등급 재계산 cron
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'dotori-recalc-grades',
      '0 4 * * *',
      'select public.dotori_recalc_activity_grades()'
    );
  end if;
exception when others then
  raise notice 'pg_cron not available — skip grade recalc cron';
end;
$$;
