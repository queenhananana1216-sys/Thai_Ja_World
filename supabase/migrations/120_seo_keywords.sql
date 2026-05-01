-- Programmatic SEO: 뉴스 processed_news에 AI 추출 키워드 배열
alter table public.processed_news
  add column if not exists seo_keywords text[] not null default '{}';

comment on column public.processed_news.seo_keywords is
  'AI/스텁이 추출한 검색 키워드(최대 수개). 메타·JSON-LD·내부 SEO용.';

create index if not exists processed_news_seo_keywords_gin
  on public.processed_news using gin (seo_keywords);
