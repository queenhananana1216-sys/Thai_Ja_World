-- ============================================================
-- 041_knowledge_narrow_rss.sql
-- 지식 수집은 비자·생활·사건 위주로 줄이기: 월드/탑/비즈/오피니언 RSS 비활성화
-- ============================================================

update public.knowledge_sources
set is_active = false
where kind = 'rss'
  and rss_url in (
    'https://www.bangkokpost.com/rss/data/topstories.xml',
    'https://www.bangkokpost.com/rss/data/world.xml',
    'https://www.bangkokpost.com/rss/data/business.xml',
    'https://www.bangkokpost.com/rss/data/opinion.xml'
  );
