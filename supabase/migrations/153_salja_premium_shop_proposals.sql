-- 살자 프리미엄 상점: AI 제안 큐 + 영구·90일+ 중심 시드
-- RLS ON · 정책 없음 → service_role만 실사용 (클라 직접 접근 불가)

create table if not exists public.salja_shop_item_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending',
  source text not null default 'ai-watchdog',
  item_key text not null,
  category text not null,
  label_ko text not null,
  label_th text not null,
  price_points int not null,
  rental_days int,
  rental_price int,
  payload jsonb not null default '{}'::jsonb,
  sort_order int not null default 500,
  svg_markup text,
  css_snippet text,
  trigger_context jsonb not null default '{}'::jsonb,
  external_ref text,
  constraint salja_shop_item_proposals_status_ck check (status in ('pending', 'accepted', 'rejected')),
  constraint salja_shop_item_proposals_category_ck check (category in ('room_skin', 'minimi', 'bgm')),
  constraint salja_shop_item_proposals_price_ck check (price_points > 0 and price_points <= 500000),
  constraint salja_shop_item_proposals_rental_ck check (rental_days is null or rental_days >= 90),
  constraint salja_shop_item_proposals_payload_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.salja_shop_item_proposals is
  'AI·워치독이 제안한 프리미엄 상점 아이템 초안. 오너 승인 시 style_shop_items에 반영.';

create unique index if not exists salja_shop_item_proposals_external_ref_uidx
  on public.salja_shop_item_proposals (external_ref)
  where external_ref is not null;

create index if not exists salja_shop_item_proposals_status_created_idx
  on public.salja_shop_item_proposals (status, created_at desc);

alter table public.salja_shop_item_proposals enable row level security;

-- 프리미엄 부티크 전용 시드 (영구 또는 90일+) — 도토리 소모량 높게
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
  active
)
values
  (
    'skin_atelier_marble',
    'room_skin',
    5200,
    null,
    null,
    '아틀리에 마블 · 명품 스킨',
    'สกินมาร์เบิลอะตอลิเย',
    '{"accent":"#e8e4dc","boutique":"atelier_marble"}'::jsonb,
    5,
    'legend',
    14,
    2,
    'platform',
    true
  ),
  (
    'skin_obsidian_gold',
    'room_skin',
    8800,
    null,
    null,
    '옵시디언 & 골드 듀오',
    'อ็อบซิเดียน & โกลด์',
    '{"accent":"#0f172a","boutique":"obsidian_gold"}'::jsonb,
    6,
    'legend',
    30,
    3,
    'platform',
    true
  ),
  (
    'minimi_celestial_rare',
    'minimi',
    12500,
    null,
    null,
    '미니미 · 셀레스티얼 레어',
    'มินิมี · เซเลสเชียล แรร์',
    '{"minimi":"✨","boutique":"celestial"}'::jsonb,
    12,
    'legend',
    30,
    3,
    'platform',
    true
  ),
  (
    'minimi_silk_moth',
    'minimi',
    9800,
    null,
    null,
    '미니미 · 실크 모스',
    'มินิมี · ซิลค์มอธ',
    '{"minimi":"🦋","boutique":"silk_moth"}'::jsonb,
    13,
    'premium',
    14,
    2,
    'platform',
    true
  ),
  (
    'bgm_philharmonic_dark',
    'bgm',
    7200,
    null,
    null,
    '프리미엄 BGM · 필하모닉 다크',
    'BGM พรีเมียม · ฟิลฮาร์มอนิกดาร์ก',
    '{"bgm_url":"/audio/bgm/philharmonic-dark.mp3","bgm_title":"Philharmonic Dark"}'::jsonb,
    20,
    'legend',
    14,
    2,
    'platform',
    true
  ),
  (
    'bgm_saison_pass',
    'bgm',
    2400,
    90,
    680,
    '프리미엄 BGM · 시즌 패스 (90일)',
    'BGM พรีเมียม · พาส 90 วัน',
    '{"bgm_url":"/audio/bgm/saison-pass.mp3","bgm_title":"Saison Pass"}'::jsonb,
    21,
    'premium',
    0,
    1,
    'platform',
    true
  )
on conflict (item_key) do nothing;

notify pgrst, 'reload_schema';
