-- =============================================================================
-- 071_homepage_real_data_rpcs.sql
-- 홈페이지 실DB 연결: 인기글, 핫글 RPC
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. get_popular_posts: 인기글 TOP N (30일 기준)
-- -----------------------------------------------------------------------------
create or replace function public.get_popular_posts(
  limit_n int default 5,
  days_back int default 30
)
returns table (
  id uuid,
  title text,
  author_name text,
  category text,
  reaction_count bigint,
  comment_count int,
  view_count int,
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
    case when p.is_anonymous then '익명' else coalesce(pr.display_name, '탈퇴회원') end as author_name,
    p.category,
    coalesce(rc.cnt, 0) as reaction_count,
    p.comment_count,
    p.view_count,
    p.created_at
  from public.posts p
  left join public.profiles pr on pr.id = p.author_id
  left join lateral (
    select count(*) as cnt
    from public.post_reactions r
    where r.post_id = p.id
  ) rc on true
  where p.moderation_status = 'safe'
    and coalesce(p.author_hidden, false) = false
    and p.created_at > now() - (days_back || ' days')::interval
  order by (coalesce(rc.cnt, 0) * 3 + p.comment_count * 2 + p.view_count) desc
  limit greatest(1, least(coalesce(limit_n, 5), 20));
$$;

alter function public.get_popular_posts(int, int) owner to postgres;
grant execute on function public.get_popular_posts(int, int) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. get_chat_preview: 채팅 프리뷰 (lobby 최근 N개)
-- -----------------------------------------------------------------------------
create or replace function public.get_chat_preview(limit_n int default 3)
returns table (
  id uuid,
  body text,
  author_name text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    cm.id,
    cm.body,
    coalesce(pr.display_name, '???') as author_name,
    cm.created_at
  from public.chat_messages cm
  inner join public.chat_rooms cr on cr.id = cm.room_id and cr.slug = 'lobby' and cr.is_active = true
  left join public.profiles pr on pr.id = cm.author_id
  where cm.is_deleted = false
  order by cm.created_at desc
  limit greatest(1, least(coalesce(limit_n, 3), 10));
$$;

alter function public.get_chat_preview(int) owner to postgres;
grant execute on function public.get_chat_preview(int) to anon, authenticated;
