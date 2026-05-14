-- Bangkok Post: crime.xml and general.xml return 404. Remap to working feeds.
-- Same intent as 091_fix_bangkokpost_rss_404.sql.

update public.knowledge_sources
set
  rss_url = 'https://www.bangkokpost.com/rss/data/thailand.xml',
  is_active = true
where kind = 'rss'
  and rss_url = 'https://www.bangkokpost.com/rss/data/crime.xml';

update public.knowledge_sources
set
  rss_url = 'https://www.bangkokpost.com/rss/data/topstories.xml',
  is_active = true
where kind = 'rss'
  and rss_url = 'https://www.bangkokpost.com/rss/data/general.xml';
