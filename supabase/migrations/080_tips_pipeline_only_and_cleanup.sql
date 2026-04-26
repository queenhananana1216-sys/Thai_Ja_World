-- =============================================================================
-- 080_tips_pipeline_only_and_cleanup.sql
-- 꿀팁 허브(/tips)는 파이프라인(processed_knowledge)에서 승인된 글만 노출
-- + 과거 사용자/수동 데이터로 잘못 표시된 is_knowledge_tip 정리
-- =============================================================================

-- 1) 기존 잘못 표시된 tip 플래그 정리
--    - processed_knowledge(published=true, board_target='tips_board')와 연결되지 않은 글은 tip 허브 제외
update public.posts p
set is_knowledge_tip = false
where p.is_knowledge_tip = true
  and not exists (
    select 1
    from public.processed_knowledge pk
    where pk.post_id = p.id
      and pk.published = true
      and pk.board_target = 'tips_board'
  );

-- 2) 비회원용 tips 목록 RPC: 파이프라인 승인 글만
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
    and exists (
      select 1
      from public.processed_knowledge pk
      where pk.post_id = p.id
        and pk.published = true
        and pk.board_target = 'tips_board'
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(limit_n, 40), 100));
$$;

-- 3) 비회원용 단건 RPC: 파이프라인 승인 글만
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
    and p.is_knowledge_tip = true
    and exists (
      select 1
      from public.processed_knowledge pk
      where pk.post_id = p.id
        and pk.published = true
        and pk.board_target = 'tips_board'
    );
$$;

alter function public.get_tips_public(int) owner to postgres;
alter function public.get_tip_public(uuid) owner to postgres;

grant execute on function public.get_tips_public(int) to anon, authenticated;
grant execute on function public.get_tip_public(uuid) to anon, authenticated;
