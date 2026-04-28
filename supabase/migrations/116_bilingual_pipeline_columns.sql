alter table public.processed_news
  add column if not exists title_kr text,
  add column if not exists content_kr text,
  add column if not exists title_th text,
  add column if not exists content_th text;

alter table public.tips_articles
  add column if not exists title_kr text,
  add column if not exists content_kr text,
  add column if not exists title_th text,
  add column if not exists content_th text;
