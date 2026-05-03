-- =============================================================================
-- 146_portal_search_logs_photo_strip.sql
-- 포털 실시간 급상승 검색어(search_logs 집계) + 최근 이미지 게시글 스트립 RPC
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) search_logs — 공개 읽기 없음, 트렌드는 SECURITY DEFINER RPC 만
-- ---------------------------------------------------------------------------
create table if not exists public.search_logs (
  id uuid primary key default gen_random_uuid(),
  query_norm text not null,
  created_at timestamptz not null default now(),
  constraint search_logs_query_norm_len_ck check (
    char_length(query_norm) >= 2 and char_length(query_norm) <= 128
  )
);

create index if not exists idx_search_logs_created_at on public.search_logs (created_at desc);
create index if not exists idx_search_logs_norm_created on public.search_logs (query_norm, created_at desc);

comment on table public.search_logs is
  '사이트 검색 정규화 쿼리 로그 — 포털 급상승 키워드 집계용. 행 단위 공개 SELECT 없음.';

alter table public.search_logs enable row level security;

-- 직접 테이블 접근 차단(소유자·서비스 롤 제외). 앱은 RPC 만 사용.
revoke all on public.search_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) 검색 한 줄 기록 (anon 포함)
-- ---------------------------------------------------------------------------
create or replace function public.portal_log_site_search(p_query text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q text := lower(trim(coalesce(p_query, '')));
begin
  if char_length(q) < 2 or char_length(q) > 128 then
    return;
  end if;
  insert into public.search_logs (query_norm) values (left(q, 128));
exception
  when others then
    return;
end;
$$;

alter function public.portal_log_site_search(text) owner to postgres;

grant execute on function public.portal_log_site_search(text) to anon, authenticated;

comment on function public.portal_log_site_search(text) is
  '공개 검색 API 가 호출 시 정규화 쿼리 1건 적재 (실패 무시).';

-- ---------------------------------------------------------------------------
-- 3) 급상승 키워드 TOP N
-- ---------------------------------------------------------------------------
create or replace function public.portal_trending_search_queries(
  p_hours int default 48,
  p_limit int default 10
)
returns table(rank bigint, query text, cnt bigint)
language sql
stable
security definer
set search_path = public
as $$
  select row_number() over (
           order by count(*) desc, max(sl.created_at) desc
         )::bigint as rank,
         sl.query_norm as query,
         count(*)::bigint as cnt
  from public.search_logs sl
  where sl.created_at > now() - make_interval(
          hours => greatest(1, least(coalesce(p_hours, 48), 168))
        )
  group by sl.query_norm
  order by cnt desc, max(sl.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

alter function public.portal_trending_search_queries(int, int) owner to postgres;

grant execute on function public.portal_trending_search_queries(int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) 최근 이미지 게시글(board_posts ∪ posts 광장) 썸네일 스트립
--    · 일부 DB에는 커뮤니티 마이그레이션(118) 미적용으로 board_posts 가 없을 수 있음
--      → 없으면 posts 만 조회
-- ---------------------------------------------------------------------------
create or replace function public.portal_recent_photo_strip(p_limit int default 10)
returns table(source text, post_id uuid, thumb_url text, title text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int := greatest(1, least(coalesce(p_limit, 10), 30));
begin
  if to_regclass('public.board_posts') is not null then
    return query
    select *
    from (
      select 'board'::text as source,
             bp.id as post_id,
             nullif(trim(bp.image_urls[1]), '')::text as thumb_url,
             bp.title::text as title,
             bp.created_at
      from public.board_posts bp
      where cardinality(bp.image_urls) > 0
        and nullif(trim(bp.image_urls[1]), '') is not null
      union all
      select 'plaza'::text,
             p.id,
             nullif(trim(p.image_urls[1]), '')::text,
             p.title::text,
             p.created_at
      from public.posts p
      where cardinality(p.image_urls) > 0
        and nullif(trim(p.image_urls[1]), '') is not null
        and p.moderation_status = 'safe'
        and coalesce(p.author_hidden, false) = false
    ) u
    where u.thumb_url is not null
    order by u.created_at desc
    limit lim;
  else
    return query
    select 'plaza'::text as source,
           p.id as post_id,
           nullif(trim(p.image_urls[1]), '')::text as thumb_url,
           p.title::text as title,
           p.created_at
    from public.posts p
    where cardinality(p.image_urls) > 0
      and nullif(trim(p.image_urls[1]), '') is not null
      and p.moderation_status = 'safe'
      and coalesce(p.author_hidden, false) = false
    order by p.created_at desc
    limit lim;
  end if;
end;
$$;

alter function public.portal_recent_photo_strip(int) owner to postgres;

grant execute on function public.portal_recent_photo_strip(int) to anon, authenticated;

commit;
