-- 한인 생활망 자가 치유: enum 확장 + 연락 채널 컬럼 + 최소 시드(빈 목록 방지)
-- PostgREST: NOTIFY pgrst, 'reload_schema';

-- 1) 카테고리 enum (시드 파일 135와 동일)
alter type public.korean_biz_category add value if not exists 'vehicle_rent';
alter type public.korean_biz_category add value if not exists 'golf';
alter type public.korean_biz_category add value if not exists 'massage_spa';

-- 2) 연락 채널 (157과 중복 가능 — IF NOT EXISTS)
alter table if exists public.korean_businesses
  add column if not exists line_url text,
  add column if not exists whatsapp_url text,
  add column if not exists contact_checked_at timestamptz,
  add column if not exists contact_link_ok boolean;

-- 3) RLS·GRANT 재확인 (드리프트 복구)
alter table if exists public.korean_businesses enable row level security;

drop policy if exists "korean_businesses_select_public" on public.korean_businesses;
create policy "korean_businesses_select_public"
  on public.korean_businesses
  for select
  to anon, authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on table public.korean_businesses to anon, authenticated;

-- 4) 시드 12건 — google_place_id 충돌 시 무시
insert into public.korean_businesses (
  google_place_id, name, category, region, address, phone, latitude, longitude,
  is_verified, last_verified_at, line_url, whatsapp_url, contact_link_ok, contact_checked_at
)
values
  (
    'taeja_seed_bkk_m1',
    '방콕 한인마트 라이브(시드)',
    'mart',
    'bangkok',
    'Sukhumvit',
    '+66820002001',
    13.7367,
    100.5631,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_mart',
    'https://wa.me/66820002001',
    true,
    now()
  ),
  (
    'taeja_seed_bkk_p1',
    '방콕 한인약국 큐레이션(시드)',
    'pharmacy',
    'bangkok',
    'Thonglor',
    '+66820002002',
    13.7244,
    100.5841,
    true,
    now(),
    null,
    'https://wa.me/66820002002',
    true,
    now()
  ),
  (
    'taeja_seed_bkk_h1',
    '방콕 한인 클리닉 허브(시드)',
    'hospital',
    'bangkok',
    'Asok',
    '+66820002003',
    13.7379,
    100.5604,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_clinic',
    'https://wa.me/66820002003',
    true,
    now()
  ),
  (
    'taeja_seed_ptt_m1',
    '파타야 한인마트 스파크(시드)',
    'mart',
    'pattaya',
    'Beach Rd',
    '+66820002004',
    12.9316,
    100.8829,
    true,
    now(),
    null,
    'https://wa.me/66820002004',
    true,
    now()
  ),
  (
    'taeja_seed_ptt_s1',
    '파타야 힐링 스파(시드)',
    'massage_spa',
    'pattaya',
    'Jomtien',
    '+66820002005',
    12.8771,
    100.8797,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_spa',
    'https://wa.me/66820002005',
    true,
    now()
  ),
  (
    'taeja_seed_ptt_r1',
    '파타야 바이크 렌트(시드)',
    'vehicle_rent',
    'pattaya',
    'South Pattaya',
    '+66820002006',
    12.9236,
    100.8825,
    true,
    now(),
    null,
    'https://wa.me/66820002006',
    true,
    now()
  ),
  (
    'taeja_seed_cm_m1',
    '치앙마이 한인마트 님만(시드)',
    'mart',
    'chiangmai',
    'Nimman',
    '+66820002007',
    18.7961,
    98.9793,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_cm',
    'https://wa.me/66820002007',
    true,
    now()
  ),
  (
    'taeja_seed_cm_p1',
    '치앙마이 한약국(시드)',
    'pharmacy',
    'chiangmai',
    'Old City',
    '+66820002008',
    18.7883,
    98.9853,
    true,
    now(),
    null,
    'https://wa.me/66820002008',
    true,
    now()
  ),
  (
    'taeja_seed_cm_g1',
    '치앙마이 골프 예약 데스크(시드)',
    'golf',
    'chiangmai',
    'Hang Dong',
    '+66820002009',
    18.6876,
    98.9196,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_golf',
    'https://wa.me/66820002009',
    true,
    now()
  ),
  (
    'taeja_seed_bkk_g1',
    '방콕 골프 픽업(시드)',
    'golf',
    'bangkok',
    'Rama IX',
    '+66820002010',
    13.7563,
    100.5018,
    true,
    now(),
    null,
    'https://wa.me/66820002010',
    true,
    now()
  ),
  (
    'taeja_seed_bkk_s1',
    '방콕 야간 스파 라운지(시드)',
    'massage_spa',
    'bangkok',
    'Phrom Phong',
    '+66820002011',
    13.7309,
    100.5697,
    true,
    now(),
    'https://line.me/R/ti/p/@taeja_seed_nightspa',
    'https://wa.me/66820002011',
    true,
    now()
  ),
  (
    'taeja_seed_bkk_r1',
    '방콕 모터사이클 익스프레스(시드)',
    'vehicle_rent',
    'bangkok',
    'On Nut',
    '+66820002012',
    13.7147,
    100.6018,
    true,
    now(),
    null,
    'https://wa.me/66820002012',
    true,
    now()
  )
on conflict (google_place_id) do nothing;

notify pgrst, 'reload_schema';
