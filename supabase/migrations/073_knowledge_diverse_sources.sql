-- =============================================================================
-- 073_knowledge_diverse_sources.sql
-- 콘텐츠 소스 확장: 한국어 검색RSS 재활성화 + 다양한 카테고리 신규 추가
-- 목표: 비자/꿀팁/맛집/패션/부동산/안전/문화 전방위 콘텐츠
-- =============================================================================

-- ── 1. 기존 한국어 search_rss 재활성화 (039에서 전부 끔) ──
update public.knowledge_sources
set is_active = true
where kind = 'search_rss'
  and search_query in (
    '태국 비자 장기비자 연장 서류',
    '태국 생활 꿀팁 교민 정보',
    '태국 입국 출국 여행자 주의사항'
  );

-- ── 2. 생활/꿀팁 검색 소스 ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 생활 정보 (한국어)', 'search_rss', '태국 생활 정보 한인 교민 방콕', true),
  ('태국 은행 계좌 송금 (한국어)', 'search_rss', '태국 은행 계좌개설 해외송금 방법', true),
  ('태국 핸드폰 유심 인터넷 (한국어)', 'search_rss', '태국 유심 핸드폰 인터넷 개통', true),
  ('태국 의료 병원 (한국어)', 'search_rss', '태국 병원 의료관광 건강검진 추천', true)
on conflict do nothing;

-- ── 3. 맛집/음식 검색 소스 ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('방콕 맛집 추천 (한국어)', 'search_rss', '방콕 맛집 추천 한국인 로컬 음식', true),
  ('치앙마이 카페 맛집 (한국어)', 'search_rss', '치앙마이 카페 맛집 님만해민 올드타운', true),
  ('태국 길거리 음식 (한국어)', 'search_rss', '태국 길거리 음식 야시장 먹거리', true)
on conflict do nothing;

-- ── 4. 부동산/임대 ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 콘도 임대 (한국어)', 'search_rss', '태국 콘도 임대 방콕 월세 전세', true),
  ('태국 부동산 투자 (한국어)', 'search_rss', '태국 부동산 투자 외국인 콘도 구매', true)
on conflict do nothing;

-- ── 5. 문화/패션/트렌드 ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 문화 축제 (한국어)', 'search_rss', '태국 축제 문화 송크란 로이끄라통', true),
  ('방콕 쇼핑 패션 (한국어)', 'search_rss', '방콕 쇼핑 패션 쇼핑몰 시암 짜뚜짝', true)
on conflict do nothing;

-- ── 6. 안전/사건사고 ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 안전 사건사고 (한국어)', 'search_rss', '태국 사건사고 한국인 안전 주의보', true),
  ('태국 날씨 자연재해 (한국어)', 'search_rss', '태국 날씨 홍수 태풍 우기 여행', true)
on conflict do nothing;

-- ── 7. 영어 RSS 추가 (Bangkok Post 추가 섹션) ──
insert into public.knowledge_sources (name, kind, rss_url, is_active)
select v.name, 'rss'::text, v.rss_url, true
from (values
  ('Bangkok Post — Property', 'https://www.bangkokpost.com/rss/data/property.xml'),
  ('Bangkok Post — Auto', 'https://www.bangkokpost.com/rss/data/auto.xml'),
  ('Bangkok Post — Tech', 'https://www.bangkokpost.com/rss/data/tech.xml'),
  ('Bangkok Post — Learning', 'https://www.bangkokpost.com/rss/data/learning.xml')
) as v(name, rss_url)
where not exists (
  select 1 from public.knowledge_sources k
  where k.kind = 'rss' and k.rss_url = v.rss_url
);

-- ── 8. 주 태국 대한민국 대사관 ──
insert into public.knowledge_sources (name, kind, url_list_json, is_active)
select
  '주 태국 대한민국 대사관 공지'::text,
  'url_list'::text,
  jsonb_build_array(
    jsonb_build_object('url', 'https://overseas.mofa.go.kr/th-ko/index.do', 'label', '주태국 대한민국 대사관 — 공지사항 비자 교민'),
    jsonb_build_object('url', 'https://overseas.mofa.go.kr/th-ko/brd/m_3857/list.do', 'label', '주태국 대한민국 대사관 — 영사공지 안전'),
    jsonb_build_object('url', 'https://www.thaiembassy.com/visa-application', 'label', '태국 비자 신청 안내 (영문)')
  ),
  true
where not exists (
  select 1 from public.knowledge_sources k
  where k.name = '주 태국 대한민국 대사관 공지'
);
