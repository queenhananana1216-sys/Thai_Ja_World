-- =============================================================================
-- 095_local_sponsor_style_shop.sql
-- 로컬 광고주/상점 연동용 스타일 상점 메타 확장
-- =============================================================================

alter table public.style_shop_items
  add column if not exists source_type text not null default 'platform',
  add column if not exists sponsor_name text,
  add column if not exists sponsor_region text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'style_shop_items_source_type_check'
  ) then
    alter table public.style_shop_items
      add constraint style_shop_items_source_type_check
      check (source_type in ('platform', 'local_sponsor'));
  end if;
end $$;

create index if not exists idx_style_shop_items_source_type
  on public.style_shop_items (source_type, active, sort_order);

update public.style_shop_items
set source_type = 'platform'
where source_type not in ('platform', 'local_sponsor');

insert into public.style_shop_items (
  item_key,
  category,
  price_points,
  rental_days,
  rental_price,
  label_ko,
  label_th,
  payload,
  sort_order,
  tier,
  min_days_since_join,
  min_activity_grade,
  source_type,
  sponsor_name,
  sponsor_region
)
values
  (
    'local_bangkok_neon_night',
    'wallpaper',
    220,
    30,
    60,
    '방콕 네온 나이트 (로컬 스폰서)',
    'Bangkok Neon Night (สปอนเซอร์ท้องถิ่น)',
    '{"wallpaper":"/images/walls/bangkok-neon-night.webp"}'::jsonb,
    140,
    'premium',
    14,
    2,
    'local_sponsor',
    'Bangkok Local Partner',
    'Bangkok'
  ),
  (
    'local_chiangmai_river_breeze',
    'bgm',
    180,
    30,
    45,
    '치앙마이 리버 브리즈 BGM (로컬 스폰서)',
    'Chiang Mai River Breeze BGM (สปอนเซอร์ท้องถิ่น)',
    '{"bgm_url":"/audio/bgm/chiangmai-river-breeze.mp3","bgm_title":"Chiang Mai River Breeze"}'::jsonb,
    240,
    'premium',
    14,
    2,
    'local_sponsor',
    'Chiang Mai Local Partner',
    'Chiang Mai'
  )
on conflict (item_key) do update
  set source_type = excluded.source_type,
      sponsor_name = excluded.sponsor_name,
      sponsor_region = excluded.sponsor_region,
      label_ko = excluded.label_ko,
      label_th = excluded.label_th,
      payload = excluded.payload,
      active = true;
