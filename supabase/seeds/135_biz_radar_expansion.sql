-- =============================================================================
-- 135_biz_radar_expansion.sql — 방콕/파타야/치앙마이 한인 Biz 더미 시드
-- enum 추가는 같은 세션/트랜잭션에서 INSERT와 함께 실행 불가(PG 55P04).
-- 먼저 실행: npx supabase db query --linked -f supabase/seeds/135_biz_radar_expansion_enums.sql
-- 그 다음: npx supabase db query --linked -f supabase/seeds/135_biz_radar_expansion.sql
-- =============================================================================

-- 더미 시드 — google_place_id 는 Places ID가 아닌 내부 키(tj_seed_*) 로 충돌 방지
insert into public.korean_businesses (
  google_place_id,
  name,
  category,
  region,
  address,
  phone,
  latitude,
  longitude,
  is_verified,
  last_verified_at
)
values
  (
    'tj_seed_vehicle_rent_bkk_001',
    '태자 바이크 렌탈 (방콕·한국어)',
    'vehicle_rent',
    'bangkok',
    'กรุงเทพฯ สุขุมวิท — 한국어 상담 · 스쿠터·오토바이',
    '+66 81 000 1001',
    13.7382,
    100.5607,
    true,
    now()
  ),
  (
    'tj_seed_vehicle_rent_bkk_002',
    '김씨 오토바이 렌트 · 라차다',
    'vehicle_rent',
    'bangkok',
    'Bangkok Ratchada — 차량·바이크 장기 렌트',
    '+66 82 000 1002',
    13.7654,
    100.5731,
    true,
    now()
  ),
  (
    'tj_seed_vehicle_rent_ptt_001',
    '파타야 코리안 모터렌트',
    'vehicle_rent',
    'pattaya',
    'พัทยา ถนนชายหาด — 한국인 운영 데스크',
    '+66 81 000 2001',
    12.9314,
    100.8829,
    true,
    now()
  ),
  (
    'tj_seed_vehicle_rent_ptt_002',
    'Joker Bike Rental Pattaya (KR)',
    'vehicle_rent',
    'pattaya',
    'Pattaya Beach Rd — daily scooter hire',
    '+66 82 000 2002',
    12.9361,
    100.8904,
    true,
    now()
  ),
  (
    'tj_seed_vehicle_rent_cnx_001',
    '치앙마이 노드림 바이크 · 한국어',
    'vehicle_rent',
    'chiangmai',
    'เชียงใหม่ นิมมาน — 스쿠터 렌트',
    '+66 81 000 3001',
    18.8012,
    98.9654,
    true,
    now()
  ),
  (
    'tj_seed_golf_bkk_001',
    '방콕 코리안 골프 투어 부킹센터',
    'golf',
    'bangkok',
    'Bangkok — 골프 패키지·픽업 한국어 예약',
    '+66 2 000 3101',
    13.7563,
    100.5018,
    true,
    now()
  ),
  (
    'tj_seed_golf_bkk_002',
    '깐차나부리 CC 예약 데스크 (한국어)',
    'golf',
    'bangkok',
    '방콕 인근 라운딩 · 한인 에이전시 연계',
    '+66 81 000 3102',
    13.7289,
    100.4788,
    true,
    now()
  ),
  (
    'tj_seed_golf_ptt_001',
    '파타야 시암 컨트리 클럽 · 코리안 예약',
    'golf',
    'pattaya',
    'พัทยา — 라운드·캐디 한국어 안내',
    '+66 81 000 3201',
    12.9205,
    100.8766,
    true,
    now()
  ),
  (
    'tj_seed_golf_ptt_002',
    '피닉스 골드 파타야 투어 (KR Desk)',
    'golf',
    'pattaya',
    'Pattaya — 그린피·교통 패키지',
    '+66 82 000 3202',
    12.9088,
    100.8991,
    true,
    now()
  ),
  (
    'tj_seed_golf_cnx_001',
    '치앙마이 알파인 골프 투어 코리안',
    'golf',
    'chiangmai',
    'เชียงใหม่ — 산악 코스·예약 대행',
    '+66 81 000 3301',
    18.7901,
    98.9917,
    true,
    now()
  ),
  (
    'tj_seed_spa_bkk_001',
    '프라투남 코리안 제휴 스파',
    'massage_spa',
    'bangkok',
    'กรุงเทพฯ พระราม 1 — 타이·아로마 한국어 가능',
    '+66 81 000 4101',
    13.7490,
    100.5412,
    true,
    now()
  ),
  (
    'tj_seed_spa_bkk_002',
    '금손 타이마사지 (한국 매니저)',
    'massage_spa',
    'bangkok',
    'Bangkok — 스포츠·오일 마사지',
    '+66 82 000 4102',
    13.7044,
    100.5027,
    true,
    now()
  ),
  (
    'tj_seed_spa_ptt_001',
    '파타야 코리안 스파 리조트로드',
    'massage_spa',
    'pattaya',
    'พัทยา — 풋·아로마 프라이빗 룸',
    '+66 81 000 4201',
    12.9244,
    100.8855,
    true,
    now()
  ),
  (
    'tj_seed_spa_ptt_002',
    'Relax Thai Spa · 한국어 OK (파타야)',
    'massage_spa',
    'pattaya',
    'Pattaya — 커플·패밀리 룸',
    '+66 82 000 4202',
    12.9412,
    100.8933,
    true,
    now()
  ),
  (
    'tj_seed_spa_cnx_001',
    '치앙마이 림핑 한올 스파 (코리안 제휴)',
    'massage_spa',
    'chiangmai',
    'เชียงใหม่ — 림핑 지역 힐링',
    '+66 81 000 4301',
    18.7723,
    98.9814,
    true,
    now()
  )
on conflict (google_place_id) do nothing;

notify pgrst, 'reload_schema';
