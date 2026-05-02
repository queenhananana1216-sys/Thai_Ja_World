-- =============================================================================
-- 136_board_reports_verified.sql
-- 검증 제보 게시판(board_type = reports): 일반 유저는 글 작성 불가(서비스 롤·관리자 API만).
-- 댓글·공감은 reports 글에 한해 허용.
-- 제보함 SNS 링크: site_settings report.*_url
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) board_posts — board_type 에 reports 추가
-- ---------------------------------------------------------------------------
alter table public.board_posts
  drop constraint if exists board_posts_board_type_check;

alter table public.board_posts
  add constraint board_posts_board_type_check
  check (board_type in ('free', 'info', 'reports'));

comment on column public.board_posts.board_type is
  'free: 자유, info: 정보 공유, reports: 운영 검증 제보(글 작성은 관리자·서비스 롤만)';

-- ---------------------------------------------------------------------------
-- 2) board_posts RLS — authenticated 는 free/info 만 소유자 CUD
--    (reports 는 JWT 클라이언트 직접 CUD 불가 — service_role 이 RLS 우회)
-- ---------------------------------------------------------------------------
drop policy if exists board_posts_insert_own on public.board_posts;
drop policy if exists board_posts_update_own on public.board_posts;
drop policy if exists board_posts_delete_own on public.board_posts;

create policy board_posts_insert_free_info_own on public.board_posts
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and board_type in ('free', 'info')
  );

create policy board_posts_update_free_info_own on public.board_posts
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and board_type in ('free', 'info')
  )
  with check (
    user_id = (select auth.uid())
    and board_type in ('free', 'info')
  );

create policy board_posts_delete_free_info_own on public.board_posts
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and board_type in ('free', 'info')
  );

-- ---------------------------------------------------------------------------
-- 3) board_post_comments — 통합 게시판(board_posts) 전용 댓글
-- ---------------------------------------------------------------------------
create table if not exists public.board_post_comments (
  id uuid primary key default gen_random_uuid(),
  board_post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  parent_comment_id uuid null references public.board_post_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint board_post_comments_content_len_ck
    check (char_length(trim(content)) > 0 and char_length(content) <= 8000)
);

create index if not exists idx_board_post_comments_post_created
  on public.board_post_comments (board_post_id, created_at asc);

create index if not exists idx_board_post_comments_parent
  on public.board_post_comments (parent_comment_id, created_at asc);

comment on table public.board_post_comments is
  'board_posts 댓글 — 현재 정책상 board_type = reports 글에만 작성 허용';

alter table public.board_post_comments enable row level security;

grant select on public.board_post_comments to anon, authenticated;
grant insert, delete on public.board_post_comments to authenticated;

drop policy if exists board_post_comments_select_public on public.board_post_comments;
create policy board_post_comments_select_public on public.board_post_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists board_post_comments_insert_reports on public.board_post_comments;
create policy board_post_comments_insert_reports on public.board_post_comments
  for insert
  to authenticated
  with check (
    (select auth.uid()) = author_id
    and exists (
      select 1
      from public.board_posts b
      where b.id = board_post_id
        and b.board_type = 'reports'
    )
    and not exists (
      select 1
      from public.profiles p
      where p.id = author_id
        and p.banned_until is not null
        and p.banned_until > now()
    )
  );

drop policy if exists board_post_comments_delete_own on public.board_post_comments;
create policy board_post_comments_delete_own on public.board_post_comments
  for delete
  to authenticated
  using ((select auth.uid()) = author_id);

-- ---------------------------------------------------------------------------
-- 4) board_post_reactions — reports 글 공감
-- ---------------------------------------------------------------------------
create table if not exists public.board_post_reactions (
  id uuid primary key default gen_random_uuid(),
  board_post_id uuid not null references public.board_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('like', 'heart')),
  created_at timestamptz not null default now()
);

create unique index if not exists board_post_reactions_uniq
  on public.board_post_reactions (board_post_id, user_id, kind);

create index if not exists idx_board_post_reactions_post_kind
  on public.board_post_reactions (board_post_id, kind, created_at desc);

alter table public.board_post_reactions enable row level security;

grant select on public.board_post_reactions to anon, authenticated;
grant insert, delete on public.board_post_reactions to authenticated;

drop policy if exists board_post_reactions_select_public on public.board_post_reactions;
create policy board_post_reactions_select_public on public.board_post_reactions
  for select
  to anon, authenticated
  using (true);

drop policy if exists board_post_reactions_insert_reports on public.board_post_reactions;
create policy board_post_reactions_insert_reports on public.board_post_reactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.board_posts b
      where b.id = board_post_id
        and b.board_type = 'reports'
    )
    and not exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.banned_until is not null
        and p.banned_until > now()
    )
  );

drop policy if exists board_post_reactions_delete_own on public.board_post_reactions;
create policy board_post_reactions_delete_own on public.board_post_reactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 5) site_settings — 제보 SNS URL (공개 읽기 유지)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value)
values
  ('report.telegram_url', to_jsonb(''::text)),
  ('report.line_url', to_jsonb(''::text)),
  ('report.whatsapp_url', to_jsonb(''::text))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 6) 서비스 RPC — reports 타입 허용 (크론·관리자 보조)
-- ---------------------------------------------------------------------------
create or replace function public.board_posts_insert_for_service(
  p_user_id uuid,
  p_board_type text,
  p_title text,
  p_content text,
  p_image_urls text[],
  p_lat double precision,
  p_lng double precision,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_board_type is null or p_board_type not in ('free', 'info', 'reports') then
    raise exception 'invalid_board_type';
  end if;
  if p_title is null or length(trim(p_title)) < 1 or length(trim(p_title)) > 200 then
    raise exception 'invalid_title';
  end if;
  if (p_lat is null) is distinct from (p_lng is null) then
    raise exception 'lat_lng_pair_required';
  end if;

  insert into public.board_posts (
    user_id,
    board_type,
    title,
    content,
    image_urls,
    lat,
    lng,
    address
  )
  values (
    p_user_id,
    p_board_type,
    trim(p_title),
    coalesce(p_content, ''),
    coalesce(p_image_urls, '{}'::text[]),
    p_lat,
    p_lng,
    p_address
  )
  returning id into v_id;

  return v_id;
end;
$$;

alter function public.board_posts_insert_for_service(uuid, text, text, text, text[], double precision, double precision, text) owner to postgres;

notify pgrst, 'reload_schema';

commit;
