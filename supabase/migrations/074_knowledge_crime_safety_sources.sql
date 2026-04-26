-- =============================================================================
-- 074_knowledge_crime_safety_sources.sql
-- 세계 사건사고 / 범죄 / 안전 관련 콘텐츠 소스 추가
-- =============================================================================

-- ── 태국 내 사건사고/범죄 (한국어) ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('태국 범죄 사기 피해 (한국어)', 'search_rss', '태국 범죄 사기 한국인 피해 보이스피싱', true),
  ('태국 교통사고 안전 (한국어)', 'search_rss', '태국 교통사고 오토바이 안전 방콕', true),
  ('태국 마약 단속 (한국어)', 'search_rss', '태국 마약 단속 외국인 체포 강제추방', true),
  ('태국 자연재해 긴급 (한국어)', 'search_rss', '태국 홍수 지진 쓰나미 태풍 긴급', true),
  ('태국 관광객 주의보 (한국어)', 'search_rss', '태국 관광객 주의 소매치기 택시 바가지', true)
on conflict do nothing;

-- ── 동남아 전체 사건사고 (한국어) ──
insert into public.knowledge_sources (name, kind, search_query, is_active) values
  ('동남아 사건사고 (한국어)', 'search_rss', '동남아 사건사고 한국인 피해 베트남 캄보디아 미얀마', true),
  ('해외 한국인 사건 (한국어)', 'search_rss', '해외 한국인 사건사고 피해 대사관 영사콜센터', true)
on conflict do nothing;

-- ── 영어 RSS (Bangkok Post Crime/Safety) ──
insert into public.knowledge_sources (name, kind, rss_url, is_active)
select v.name, 'rss'::text, v.rss_url, true
from (values
  ('Bangkok Post — Crime', 'https://www.bangkokpost.com/rss/data/crime.xml'),
  ('Bangkok Post — General', 'https://www.bangkokpost.com/rss/data/general.xml')
) as v(name, rss_url)
where not exists (
  select 1 from public.knowledge_sources k
  where k.kind = 'rss' and k.rss_url = v.rss_url
);

-- ── 공식 안전 정보 URL ──
insert into public.knowledge_sources (name, kind, url_list_json, is_active)
select
  '해외안전 공식 (사건사고/범죄)'::text,
  'url_list'::text,
  jsonb_build_array(
    jsonb_build_object('url', 'https://www.0404.go.kr/dev/country_view.mofa?idx=101&hash=&chkvalue=no2&stext=&continent=&region=&cty=0301000000&selIdx=&title=%C5%C2%B1%B9', 'label', '외교부 해외안전여행 태국 — 사건사고 안전공지'),
    jsonb_build_object('url', 'https://www.touristpolice.go.th/', 'label', '태국 관광경찰 (Tourist Police) 공식'),
    jsonb_build_object('url', 'https://www.thaipbs.or.th/news', 'label', 'Thai PBS 뉴스 — 태국 공영방송 사건사고')
  ),
  true
where not exists (
  select 1 from public.knowledge_sources k
  where k.name = '해외안전 공식 (사건사고/범죄)'
);
