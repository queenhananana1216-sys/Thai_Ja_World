-- 태자월드 직접 주입 시드: API/Places 크론 없이 한인 업소 목록 최소 확보
-- google_place_id 는 실제 Places ID 대신 충돌 방지용 합성 키(taeja126_*) 사용.
-- 재실행 안전: ON CONFLICT / WHERE NOT EXISTS

begin;

-- ---------------------------------------------------------------------------
-- korean_businesses (방콕·파타야·치앙마이 — 마트·약국·병원)
-- ---------------------------------------------------------------------------
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
) values
  (
    'taeja126_bkk_mart_koreana_sukhumvit',
    '코리아나 마트 (수쿰빗)',
    'mart',
    'bangkok',
    '161 Sukhumvit Rd, Khlong Toei, Bangkok 10110',
    '+66-2-261-xxxx',
    13.7308,
    100.5859,
    true,
    now()
  ),
  (
    'taeja126_bkk_mart_ktown_onnut',
    '온넛 한인마트 K-Town',
    'mart',
    'bangkok',
    'Bangkok (On Nut · Sukhumvit corridor)',
    '+66-81-xxx-xxxx',
    13.7053,
    100.6054,
    true,
    now()
  ),
  (
    'taeja126_bkk_mart_seoul_ekkamai',
    '서울마트 에까마이',
    'mart',
    'bangkok',
    'Sukhumvit Rd · Ekkamai area',
    '+66-2-381-xxxx',
    13.7339,
    100.5859,
    true,
    now()
  ),
  (
    'taeja126_bkk_mart_hanaro_rama9',
    '하나로 마트 라마9',
    'mart',
    'bangkok',
    'Rama IX Rd / RCA vicinity',
    '+66-2-xxx-xxxx',
    13.7565,
    100.5653,
    true,
    now()
  ),
  (
    'taeja126_bkk_mart_galleria_korea',
    '갤러리아 코리안 그로서리',
    'mart',
    'bangkok',
    'Central Bangkok — Korean grocery selection',
    '+66-2-xxx-xxxx',
    13.7465,
    100.5398,
    true,
    now()
  ),
  (
    'taeja126_bkk_hosp_bangkok_sukhumvit',
    '방콕병원 (수쿰빗)',
    'hospital',
    'bangkok',
    '2 Soi Soonvijai 7, Bang Kapi, Huai Khwang, Bangkok 10310',
    '+66-2-310-3000',
    13.7489,
    100.5848,
    true,
    now()
  ),
  (
    'taeja126_bkk_hosp_bumrungrad',
    '범그런드 국제병원',
    'hospital',
    'bangkok',
    '33 Sukhumvit Soi 3, Khlong Toei Nuea, Bangkok 10110',
    '+66-2-066-8888',
    13.7474,
    100.5529,
    true,
    now()
  ),
  (
    'taeja126_bkk_hosp_samitivej_sukhumvit',
    '삼티베·수쿰빗 병원',
    'hospital',
    'bangkok',
    '133 Sukhumvit 49, Khlong Tan Nuea, Bangkok 10110',
    '+66-2-022-2222',
    13.7367,
    100.5758,
    true,
    now()
  ),
  (
    'taeja126_bkk_phar_green_seoul',
    '그린서울약국 (수쿰빗)',
    'pharmacy',
    'bangkok',
    'Sukhumvit — Korean-speaking pharmacy desk',
    '+66-2-xxx-xxxx',
    13.7381,
    100.5608,
    true,
    now()
  ),
  (
    'taeja126_bkk_phar_korea_plaza',
    '코리아플라자 약국',
    'pharmacy',
    'bangkok',
    'Korean town shopping corridor',
    '+66-2-xxx-xxxx',
    13.7286,
    100.5766,
    true,
    now()
  ),
  (
    'taeja126_pty_mart_koreana_pattaya',
    '코리아나 마트 파타야',
    'mart',
    'pattaya',
    'Pattaya · Korean grocery & side dishes',
    '+66-38-xxx-xxxx',
    12.9356,
    100.8890,
    true,
    now()
  ),
  (
    'taeja126_pty_mart_seoul_food',
    '서울푸드 마트 파타야',
    'mart',
    'pattaya',
    'Central Pattaya area',
    '+66-38-xxx-xxxx',
    12.9236,
    100.8825,
    true,
    now()
  ),
  (
    'taeja126_pty_hosp_bangkok_pattaya',
    '방콕병원 파타야',
    'hospital',
    'pattaya',
    '301 Moo 6 Sukhumvit Rd, Bang Lamung, Chon Buri 20150',
    '+66-38-259-9999',
    12.9497,
    100.8927,
    true,
    now()
  ),
  (
    'taeja126_pty_phar_k_health',
    'K-헬스약국 파타야',
    'pharmacy',
    'pattaya',
    'Pattaya — OTC & Korean imports',
    '+66-38-xxx-xxxx',
    12.9310,
    100.8760,
    true,
    now()
  ),
  (
    'taeja126_pty_phar_seoul_rx',
    '서울팜약국 (파타야)',
    'pharmacy',
    'pattaya',
    'Jomtien / Pattaya beach road vicinity',
    '+66-38-xxx-xxxx',
    12.9105,
    100.8769,
    true,
    now()
  ),
  (
    'taeja126_cnx_mart_korea_nimman',
    '코리아마트 님만',
    'mart',
    'chiangmai',
    'Nimmanhaemin · Korean imports',
    '+66-53-xxx-xxxx',
    18.8006,
    98.9684,
    true,
    now()
  ),
  (
    'taeja126_cnx_mart_hanaro_oldcity',
    '하나로 마트 치앙마이 구시가지',
    'mart',
    'chiangmai',
    'Old City / Chang Khlan vicinity',
    '+66-53-xxx-xxxx',
    18.7883,
    98.9853,
    true,
    now()
  ),
  (
    'taeja126_cnx_hosp_chiangmai_ram',
    '치앙마이 람병원',
    'hospital',
    'chiangmai',
    '8 Bunrueang Rit Rd, Suthep, Mueang Chiang Mai 50200',
    '+66-52-920-7999',
    18.8012,
    98.9694,
    true,
    now()
  ),
  (
    'taeja126_cnx_phar_seoul_nimman',
    '서울약국 님만',
    'pharmacy',
    'chiangmai',
    'Nimman — Korean OTC guidance',
    '+66-53-xxx-xxxx',
    18.7965,
    98.9652,
    true,
    now()
  ),
  (
    'taeja126_cnx_phar_kplus_airport',
    'K-플러스약국 (공항로)',
    'pharmacy',
    'chiangmai',
    'Hang Dong / airport road area',
    '+66-53-xxx-xxxx',
    18.7742,
    98.9835,
    true,
    now()
  )
on conflict (google_place_id) do nothing;

-- ---------------------------------------------------------------------------
-- 한국어 공개 뉴스 소량 (processed_news.language = ko, published = true)
-- 홈/뉴스 허브 공백 완화 — external_url 은 시드 전용 내부 URI 로 유니크 유지
-- ---------------------------------------------------------------------------
insert into public.raw_news (external_url, title, published_at, fetched_at)
select v.url, v.t, v.pub, now() at time zone 'utc'
from (
  values
    (
      'https://internal.taeja.world/seed/126-force-news-01',
      '태자 시드 뉴스(내부)',
      (now() at time zone 'utc') - interval '15 minutes'
    ),
    (
      'https://internal.taeja.world/seed/126-force-news-02',
      '태자 시드 뉴스(내부)',
      (now() at time zone 'utc') - interval '45 minutes'
    ),
    (
      'https://internal.taeja.world/seed/126-force-news-03',
      '태자 시드 뉴스(내부)',
      (now() at time zone 'utc') - interval '90 minutes'
    )
) as v(url, t, pub)
where not exists (select 1 from public.raw_news r where r.external_url = v.url);

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select r.id,
  '{"ko":{"title":"방콕·파타야 교통혼잡 완화…공항철도·고속도로 구간 증편 논의","summary":"현지 당국은 관광 성수기 맞이 차량 정체 완화를 위해 주요 관문 구간 배차와 안내 표지 다국어화를 확대한다는 방침을 밝혔다. 수쿰빗·파타야 해변도로 일대는 주말 일시 통제가 거론된다. 장거리 이동 시 공항 도착 시간에 여유를 두라는 안내가 반복된다.","blurb":"피크 시간대에는 대중교통·호출 앱 병행이 유리하다."},"source_url":"https://internal.taeja.world/seed/126-force-news-01"}',
  'ko',
  true,
  array['태국','방콕','교통']::text[]
from public.raw_news r
where r.external_url = 'https://internal.taeja.world/seed/126-force-news-01'
  and not exists (
    select 1 from public.processed_news p where p.raw_news_id = r.id
  );

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select r.id,
  '{"ko":{"title":"치앙마이·북부 상공 골목, 한인 소상공 지원 설명회 열려","summary":"비자·세무·온라인 결제 도입 사례가 공유됐다. 님만·구시가 일대 음식·리테일 매장을 중심으로 커뮤니티 번역 지원이 확대된다는 소개도 있었다. 신규 창업자에게는 현지 법인 형태와 계약서 검토 체크리스트가 안내됐다.","blurb":"임대·단속 정보는 구별 상공 단체 공지를 함께 보라."},"source_url":"https://internal.taeja.world/seed/126-force-news-02"}',
  'ko',
  true,
  array['태국','치앙마이','한인']::text[]
from public.raw_news r
where r.external_url = 'https://internal.taeja.world/seed/126-force-news-02'
  and not exists (
    select 1 from public.processed_news p where p.raw_news_id = r.id
  );

insert into public.processed_news (raw_news_id, clean_body, language, published, seo_keywords)
select r.id,
  '{"ko":{"title":"파타야 해안 안전 캠페인…야간 구조 인력·표지판 보강","summary":"야간 해수욕과 조류 변화에 대비해 인명 구조 대기 인력과 조명·안내판이 일부 구간에 추가된다는 현지 보도다. 가족 단위 관광객에게는 지정 수영 구역 준수가 당부됐다. 응급 연락망은 다국어로 통합 안내될 예정이다.","blurb":"날씨·깃발 경보를 수시로 확인하라."},"source_url":"https://internal.taeja.world/seed/126-force-news-03"}',
  'ko',
  true,
  array['태국','파타야','안전']::text[]
from public.raw_news r
where r.external_url = 'https://internal.taeja.world/seed/126-force-news-03'
  and not exists (
    select 1 from public.processed_news p where p.raw_news_id = r.id
  );

commit;

notify pgrst, 'reload_schema';
