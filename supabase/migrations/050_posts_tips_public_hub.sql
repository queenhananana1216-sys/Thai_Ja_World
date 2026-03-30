-- =============================================================================
-- 050_posts_tips_public_hub.sql
-- 지식 승인 게시글: 비회원에게는 제목·짧은 요약(excerpt)만 — 본문·출처는 로그인 후 광장에서
-- =============================================================================

alter table public.posts
  add column if not exists excerpt text;

alter table public.posts
  add column if not exists is_knowledge_tip boolean not null default false;

comment on column public.posts.excerpt is
  '비회원 /tips 허브에 노출되는 짧은 훅(한국어 요약 앞부분 등). 본문 posts.content 와 별도.';

comment on column public.posts.is_knowledge_tip is
  'true: 지식 파이프라인에서 승인된 글 — get_tips_public RPC 노출 대상.';

-- 이미 post_id 가 연결된 지식 게시글은 허브에 포함
update public.posts p
set is_knowledge_tip = true
where p.id in (
  select pk.post_id from public.processed_knowledge pk
  where pk.post_id is not null
)
  and p.category = 'info'
  and p.moderation_status = 'safe';

-- 비회원용 목록(본문 미포함) — SECURITY DEFINER 로 posts 직접 노출 없이 메타만 반환
create or replace function public.get_tips_public(limit_n int default 40)
returns table (
  id uuid,
  title text,
  excerpt text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.title,
    coalesce(nullif(trim(p.excerpt), ''), left(trim(p.title), 160)) as excerpt,
    p.created_at
  from public.posts p
  where p.moderation_status = 'safe'
    and coalesce(p.author_hidden, false) = false
    and p.category = 'info'
    and p.is_knowledge_tip = true
  order by p.created_at desc
  limit greatest(1, least(coalesce(limit_n, 40), 100));
$$;

create or replace function public.get_tip_public(p_id uuid)
returns table (
  id uuid,
  title text,
  excerpt text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.title,
    coalesce(nullif(trim(p.excerpt), ''), left(trim(p.title), 160)) as excerpt,
    p.created_at
  from public.posts p
  where p.id = p_id
    and p.moderation_status = 'safe'
    and coalesce(p.author_hidden, false) = false
    and p.category = 'info'
    and p.is_knowledge_tip = true;
$$;

alter function public.get_tips_public(int) owner to postgres;
alter function public.get_tip_public(uuid) owner to postgres;

grant execute on function public.get_tips_public(int) to anon, authenticated;
grant execute on function public.get_tip_public(uuid) to anon, authenticated;
