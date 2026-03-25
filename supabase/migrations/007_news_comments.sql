-- 뉴스( processed_news ) 댓글 + 7일 보관은 앱 Cron(raw_news 삭제)으로 처리

create table if not exists public.news_comments (
  id                  uuid primary key default gen_random_uuid(),
  processed_news_id   uuid not null references public.processed_news (id) on delete cascade,
  author_id           uuid not null references public.profiles (id) on delete cascade,
  content             text not null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_news_comments_processed
  on public.news_comments (processed_news_id, created_at);

alter table public.news_comments enable row level security;

drop policy if exists news_comments_select_all on public.news_comments;
create policy news_comments_select_all
  on public.news_comments for select
  using (true);

drop policy if exists news_comments_insert_own on public.news_comments;
create policy news_comments_insert_own
  on public.news_comments for insert
  with check (auth.uid() = author_id);

drop policy if exists news_comments_delete_own on public.news_comments;
create policy news_comments_delete_own
  on public.news_comments for delete
  using (auth.uid() = author_id);
