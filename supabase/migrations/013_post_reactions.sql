-- 013_post_reactions.sql
-- 게시글(community posts)에 좋아요/공감 반응 추가

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'heart')),
  created_at timestamptz not null default now()
);

create unique index if not exists post_reactions_uniq
  on public.post_reactions (post_id, user_id, kind);

create index if not exists idx_post_reactions_post_kind_created
  on public.post_reactions (post_id, kind, created_at desc);

-- RLS
alter table public.post_reactions enable row level security;

-- 공개: 누구나 반응 수 조회
drop policy if exists post_reactions_select_public on public.post_reactions;
create policy post_reactions_select_public
  on public.post_reactions for select
  using (true);

-- 본인만 토글(삽입/삭제)
drop policy if exists post_reactions_insert_own on public.post_reactions;
create policy post_reactions_insert_own
  on public.post_reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists post_reactions_delete_own on public.post_reactions;
create policy post_reactions_delete_own
  on public.post_reactions for delete
  using (auth.uid() = user_id);

