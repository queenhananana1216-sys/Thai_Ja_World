-- 운영 초안: 맛집·마사지 등 플레이스홀더. is_published=false → /admin/local-spots 에서 «승인» 또는 수정 후 공개.
-- 실제 주소·영업시간·가격은 관리자 검수 후 채워 주세요. slug 충돌 시 on conflict 로 스킵.

insert into public.local_spots (slug, name, description, line_url, photo_urls, category, tags, sort_order, is_published, extra)
values
  (
    'draft-thonglor-khao-soi',
    '통로르·이카이마이 인근 카오소이 (가칭)',
    '현지인·장기 거주자 사이 입소문형 북부식 커리누들 후보. 초안 — 실제 상호·위치 확인 후 공개하세요.',
    null,
    '[]'::jsonb,
    'restaurant',
    array['방콕', '통로르', '카오소이', '초안'],
    1,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Thong Lo–Ekkamai","verify":"상호·맵핀·영업시간"}'::jsonb
  ),
  (
    'draft-silom-pad-krapow',
    '실롬 런치 팟카파오 전문 (가칭)',
    '점심 웨이팅 있는 현지식 팟카파오·카이다오 스타일. 초안 — 검증 후 수정.',
    null,
    '[]'::jsonb,
    'restaurant',
    array['방콕', '실롬', '팟카파오', '초안'],
    2,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Silom","verify":"위치·위생·가격대"}'::jsonb
  ),
  (
    'draft-yaowarat-roast-duck',
    '차이나타운 구이덕·덕라이스 (가칭)',
    '야오와랏 야시장 동선과 묶어 소개하기 좋은 중식 로스트덕 후보. 초안.',
    null,
    '[]'::jsonb,
    'restaurant',
    array['방콕', '야오와랏', '덕', '초안'],
    3,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Yaowarat","verify":"현금/카드·대기시간"}'::jsonb
  ),
  (
    'draft-victory-monument-boat-noodle',
    '빅토리 기념비 보트누들 골목 (가칭)',
    '소량 다찬 스타일 보트누들. 관광객·거주자 모두 동선 잡기 쉬운 후보. 초안.',
    null,
    '[]'::jsonb,
    'restaurant',
    array['방콕', '빅토리기념비', '보트누들', '초안'],
    4,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Victory Monument","verify":"매장명·위생"}'::jsonb
  ),
  (
    'draft-ari-cafe-brunch',
    '아리·사판수완 브런치 카페 (가칭)',
    '주말 브런치·작업하기 좋은 동네 카페 톤. 초안 — 사진 URL·메뉴 추천 추가 권장.',
    null,
    '[]'::jsonb,
    'cafe',
    array['방콕', '아리', '브런치', '초안'],
    5,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Ari","verify":"와이파이·콘센트"}'::jsonb
  ),
  (
    'draft-srinagarinda-night-market-snacks',
    '시린가린다 야시장 길거리 (가칭)',
    '현지 야시장 먹거리 묶음 소개용. 초안 — 특정 코너/추천 메뉴를 채워 주세요.',
    null,
    '[]'::jsonb,
    'night_market',
    array['방콕', '야시장', '길거리', '초안'],
    6,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Srinagarindra Train Market","verify":"영업일"}'::jsonb
  ),
  (
    'draft-asok-foot-massage',
    '아속·프롬퐁 풋케어 (가칭)',
    'BTS 아속/프롬퐁 도보권 풋 마사지 후보. 초안 — 가격·럭셔리도 명시.',
    null,
    '[]'::jsonb,
    'massage',
    array['방콕', '아속', '풋', '초안'],
    10,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Asok–Phrom Phong","verify":"라이선스·청결"}'::jsonb
  ),
  (
    'draft-thonglor-aroma-spa',
    '통로르 아로마·오일 (가칭)',
    '통로르·프라칸옹 가성비 스파 톤. 초안 — 예약 링크·쿠폰 정책 확인.',
    null,
    '[]'::jsonb,
    'massage',
    array['방콕', '통로르', '스파', '초안'],
    11,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Thong Lo","verify":"가격표·팁문화"}'::jsonb
  ),
  (
    'draft-chiangmai-old-city-massage',
    '치앙마이 구시가지 Lanna 스타일 (가칭)',
    '구시가지 산책 후 휴식 코스. 초안.',
    null,
    '[]'::jsonb,
    'massage',
    array['치앙마이', '구시가지', '초안'],
    12,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Chiang Mai Old City","verify":"예약필요여부"}'::jsonb
  ),
  (
    'draft-pattaya-relax-spa',
    '파타야 비치로드·세컨드로 휴식 (가칭)',
    '파타야 숙소 근처 휴식형. 초안 — 지역 특성 반영해 문구 다듬기.',
    null,
    '[]'::jsonb,
    'massage',
    array['파타야', '휴식', '초안'],
    13,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Pattaya","verify":"정책·안내 문구"}'::jsonb
  ),
  (
    'draft-phuket-old-town-cafe',
    '푸켓타운 카페·디저트 (가칭)',
    '스리나트로드 인근 카페거리 톤. 초안.',
    null,
    '[]'::jsonb,
    'cafe',
    array['푸켓', '푸켓타운', '초안'],
    7,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Phuket Old Town","verify":"영업시간"}'::jsonb
  ),
  (
    'draft-terminal21-food-court-picks',
    '터미널21 등 푸드코트 픽 (가칭)',
    '쇼핑몰 푸드코트에서 현지 메뉴 고르는 팁용. 초안 — 지점별로 쪼개도 됨.',
    null,
    '[]'::jsonb,
    'shopping',
    array['방콕', '푸드코트', '초안'],
    8,
    false,
    '{"draft_note":"시드 초안","suggested_area":"Terminal 21","verify":"지점명"}'::jsonb
  )
on conflict (slug) do nothing;
