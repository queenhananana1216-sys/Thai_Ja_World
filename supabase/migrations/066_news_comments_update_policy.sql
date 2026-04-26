-- =============================================================================
-- 072_news_comments_update_policy.sql
-- 뉴스 댓글: 자기 댓글 수정 허용 (UPDATE RLS)
-- =============================================================================

drop policy if exists news_comments_update_own on public.news_comments;
create policy news_comments_update_own on public.news_comments
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);
