-- Supabase 성능 린트: RLS에서 auth.uid() 직접 호출은 행마다 재평가될 수 있음.
-- (select auth.uid()) 로 감싸 문(statement) 단위로 안정적으로 평가되게 함.
-- 참고: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- 본인 댓글 삭제
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- 본인 댓글 작성 + 벤 사용자 차단 (004_moderation_ban_posts_service_insert 와 동작 동일)
drop policy if exists comments_insert_authenticated on public.comments;
create policy comments_insert_authenticated on public.comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and not exists (
      select 1
      from public.profiles p
      where p.id = author_id
        and p.banned_until is not null
        and p.banned_until > now()
    )
  );

-- 삭제/RLS 필터에 쓰이는 author_id 조회 보조
create index if not exists idx_comments_author_id on public.comments (author_id);
