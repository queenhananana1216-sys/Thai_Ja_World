-- 170_home_unified_feed_stricter_stub_filter.sql

create or replace function public.get_home_unified_feed(
  limit_n integer default 20,
  cursor_created_at timestamp with time zone default null::timestamp with time zone,
  cursor_id uuid default null::uuid
)
returns table (
  kind text,
  id uuid,
  created_at timestamp with time zone,
  title text,
  excerpt text,
  category text,
  comment_count integer,
  view_count integer,
  image_url text
)
language sql
stable
set search_path to public, pg_catalog
as $func$
  with src as (
    select
      'post'::text as kind,
      p.id,
      p.created_at,
      p.title,
      p.excerpt,
      p.category,
      coalesce(p.comment_count, 0)::int as comment_count,
      coalesce(p.view_count, 0)::int as view_count,
      (case when array_length(p.image_urls, 1) > 0 then p.image_urls[1] else null end) as image_url
    from public.posts p
    where p.moderation_status = 'safe'
      and p.author_hidden = false
      and coalesce(p.is_knowledge_tip, false) = false
      and length(trim(coalesce(p.title, ''))) > 0
      and not (
        coalesce(p.title, '') ilike '%내용 준비 중%'
        or coalesce(p.title, '') ilike '%내용 준비중%'
        or coalesce(p.title, '') ilike '%내용 준비%'
        or coalesce(p.excerpt, '') ilike '%내용 준비 중%'
        or coalesce(p.excerpt, '') ilike '%내용 준비중%'
        or coalesce(p.excerpt, '') ilike '%내용 준비%'
        or coalesce(p.content, '') ilike '%내용 준비 중%'
        or coalesce(p.content, '') ilike '%내용 준비중%'
        or coalesce(p.content, '') ilike '%내용 준비%'
        or coalesce(p.title, '') ilike '%가공 전%'
        or coalesce(p.title, '') ilike '%가공전%'
        or coalesce(p.excerpt, '') ilike '%가공 전%'
        or coalesce(p.excerpt, '') ilike '%가공전%'
        or coalesce(p.content, '') ilike '%가공 전%'
        or coalesce(p.content, '') ilike '%가공전%'
        or coalesce(p.title, '') ilike '%작성 중%'
        or coalesce(p.excerpt, '') ilike '%작성 중%'
        or coalesce(p.content, '') ilike '%작성 중%'
        or coalesce(p.title, '') ilike '%작성 예정%'
        or coalesce(p.title, '') ilike '%업데이트 예정%'
        or coalesce(p.title, '') ilike '%coming soon%'
        or coalesce(p.excerpt, '') ilike '%coming soon%'
        or coalesce(p.content, '') ilike '%coming soon%'
        or coalesce(p.title, '') ilike '%placeholder%'
        or coalesce(p.excerpt, '') ilike '%placeholder%'
        or coalesce(p.content, '') ilike '%placeholder%'
      )
    union all
    select
      'job'::text as kind,
      j.id,
      j.created_at,
      j.title,
      j.excerpt,
      'job'::text as category,
      0::int as comment_count,
      0::int as view_count,
      (case when array_length(j.image_urls, 1) > 0 then j.image_urls[1] else null end) as image_url
    from public.jobs j
    where j.moderation_status = 'safe'
      and j.author_hidden = false
      and length(trim(coalesce(j.title, ''))) > 0
      and not (
        coalesce(j.title, '') ilike '%내용 준비 중%'
        or coalesce(j.title, '') ilike '%내용 준비중%'
        or coalesce(j.title, '') ilike '%내용 준비%'
        or coalesce(j.excerpt, '') ilike '%내용 준비 중%'
        or coalesce(j.excerpt, '') ilike '%내용 준비중%'
        or coalesce(j.excerpt, '') ilike '%내용 준비%'
        or coalesce(j.title, '') ilike '%가공 전%'
        or coalesce(j.title, '') ilike '%가공전%'
        or coalesce(j.excerpt, '') ilike '%가공 전%'
        or coalesce(j.excerpt, '') ilike '%가공전%'
        or coalesce(j.title, '') ilike '%작성 중%'
        or coalesce(j.excerpt, '') ilike '%작성 중%'
        or coalesce(j.title, '') ilike '%작성 예정%'
        or coalesce(j.title, '') ilike '%업데이트 예정%'
        or coalesce(j.title, '') ilike '%coming soon%'
        or coalesce(j.excerpt, '') ilike '%coming soon%'
        or coalesce(j.title, '') ilike '%placeholder%'
        or coalesce(j.excerpt, '') ilike '%placeholder%'
      )
    union all
    select
      'market'::text as kind,
      m.id,
      m.created_at,
      m.title,
      m.excerpt,
      'market'::text as category,
      0::int as comment_count,
      0::int as view_count,
      (case when array_length(m.image_urls, 1) > 0 then m.image_urls[1] else null end) as image_url
    from public.market m
    where m.moderation_status = 'safe'
      and m.author_hidden = false
      and m.status in ('available', 'reserved', 'sold')
      and length(trim(coalesce(m.title, ''))) > 0
      and not (
        coalesce(m.title, '') ilike '%내용 준비 중%'
        or coalesce(m.title, '') ilike '%내용 준비중%'
        or coalesce(m.title, '') ilike '%내용 준비%'
        or coalesce(m.excerpt, '') ilike '%내용 준비 중%'
        or coalesce(m.excerpt, '') ilike '%내용 준비중%'
        or coalesce(m.excerpt, '') ilike '%내용 준비%'
        or coalesce(m.title, '') ilike '%가공 전%'
        or coalesce(m.title, '') ilike '%가공전%'
        or coalesce(m.excerpt, '') ilike '%가공 전%'
        or coalesce(m.excerpt, '') ilike '%가공전%'
        or coalesce(m.title, '') ilike '%작성 중%'
        or coalesce(m.excerpt, '') ilike '%작성 중%'
        or coalesce(m.title, '') ilike '%작성 예정%'
        or coalesce(m.title, '') ilike '%업데이트 예정%'
        or coalesce(m.title, '') ilike '%coming soon%'
        or coalesce(m.excerpt, '') ilike '%coming soon%'
        or coalesce(m.title, '') ilike '%placeholder%'
        or coalesce(m.excerpt, '') ilike '%placeholder%'
      )
  )
  select *
  from src
  where
    cursor_created_at is null
    or (src.created_at, src.id) < (cursor_created_at, cursor_id)
  order by src.created_at desc, src.id desc
  limit greatest(1, least(limit_n, 100));
$func$;
