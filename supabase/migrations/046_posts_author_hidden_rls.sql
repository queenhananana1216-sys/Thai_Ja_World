-- 작성자 비공개: 목록·타인 열람 차단. 작성자는 로그인 세션으로 계속 열람·수정 가능.
-- anon 목록/메타는 RLS로 숨김 글 제외.

alter table public.posts
  add column if not exists author_hidden boolean not null default false;

comment on column public.posts.author_hidden is
  'true면 광장 목록·비작성자에게 숨김. 작성자 본인만 열람(세션 있는 요청).';

drop policy if exists posts_select_all on public.posts;
drop policy if exists posts_select_readable on public.posts;

create policy posts_select_readable on public.posts
  for select
  using (
    (auth.uid() = author_id)
    or (
      moderation_status = 'safe'
      and coalesce(author_hidden, false) = false
    )
  );
