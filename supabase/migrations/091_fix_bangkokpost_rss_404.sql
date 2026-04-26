-- Bangkok Post 가 /rss/data/crime.xml, general.xml 등 일부 피드를 폐기(404) — 수집 파이프라인 안정화
-- thailand / topstories 는 200 확인 (2026-04)

update public.knowledge_sources
set rss_url = 'https://www.bangkokpost.com/rss/data/thailand.xml'
where kind = 'rss'
  and rss_url = 'https://www.bangkokpost.com/rss/data/crime.xml';

update public.knowledge_sources
set rss_url = 'https://www.bangkokpost.com/rss/data/topstories.xml'
where kind = 'rss'
  and rss_url = 'https://www.bangkokpost.com/rss/data/general.xml';
