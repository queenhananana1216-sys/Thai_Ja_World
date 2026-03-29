-- ============================================================
-- 039_knowledge_trusted_rss_sources.sql
-- 구글 뉴스 search_rss 는 링크 도메인이 통제되지 않아 strict 신뢰 필터와 맞지 않음 → 비활성화.
-- 검증된 Bangkok Post 공식 RSS 만 시드 (curl 로 XML 확인됨).
-- ============================================================

update public.knowledge_sources
set is_active = false
where kind = 'search_rss';

insert into public.knowledge_sources (name, kind, rss_url, is_active)
select v.name, 'rss'::text, v.rss_url, true
from (
  values
    ('Bangkok Post — Thailand', 'https://www.bangkokpost.com/rss/data/thailand.xml'),
    ('Bangkok Post — Top stories', 'https://www.bangkokpost.com/rss/data/topstories.xml'),
    ('Bangkok Post — World', 'https://www.bangkokpost.com/rss/data/world.xml')
) as v(name, rss_url)
where not exists (
  select 1
  from public.knowledge_sources k
  where k.kind = 'rss' and k.rss_url = v.rss_url
);
