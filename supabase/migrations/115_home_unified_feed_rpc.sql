-- =============================================================================
-- 115_home_unified_feed_rpc.sql
-- 홈 하단 통합 피드 — posts + (선택) jobs + market. LANGUAGE sql 은 생성 시
-- public.jobs / market 존재를 요구하므로 plpgsql + 동적 UNION 으로 분기.
-- =============================================================================

create or replace function public.get_home_unified_feed(
  limit_n int default 16,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null
)
returns table (
  kind text,
  id uuid,
  created_at timestamptz,
  title text,
  excerpt text,
  category text,
  comment_count int,
  view_count int,
  image_url text
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  lim int := greatest(1, least(coalesce(limit_n, 16), 40));
  v_union text;
  v_sql text;
begin
  v_union := $posts$
    select
      'post'::text as kind,
      p.id,
      p.created_at,
      p.title::text,
      coalesce(
        nullif(trim(p.excerpt), ''),
        left(regexp_replace(coalesce(p.content, ''), '<[^>]+>', ' ', 'g'), 180)
      ) as excerpt,
      p.category::text,
      coalesce(p.comment_count, 0)::int as comment_count,
      coalesce(p.view_count, 0)::int as view_count,
      case
        when p.image_urls is not null and coalesce(array_length(p.image_urls, 1), 0) >= 1 then p.image_urls[1]
        else null::text
      end as image_url
    from public.posts p
    where p.moderation_status = 'safe'
      and coalesce(p.author_hidden, false) = false
      and coalesce(p.is_knowledge_tip, false) = false
      and p.category = any (array['free', 'info', 'restaurant', 'flea', 'job']::text[])
  $posts$;

  if to_regclass('public.jobs') is not null then
    v_union := v_union || $jobs$
    union all
    select
      'job'::text as kind,
      j.id,
      j.created_at,
      j.title::text,
      coalesce(
        nullif(trim(j.excerpt), ''),
        left(regexp_replace(coalesce(j.content, ''), '<[^>]+>', ' ', 'g'), 180)
      ) as excerpt,
      'job'::text as category,
      0::int as comment_count,
      0::int as view_count,
      case
        when j.image_urls is not null and coalesce(array_length(j.image_urls, 1), 0) >= 1 then j.image_urls[1]
        else null::text
      end as image_url
    from public.jobs j
    where j.moderation_status = 'safe'
      and coalesce(j.author_hidden, false) = false
    $jobs$;
  end if;

  if to_regclass('public.market') is not null then
    v_union := v_union || $market$
    union all
    select
      'market'::text as kind,
      m.id,
      m.created_at,
      m.title::text,
      coalesce(
        nullif(trim(m.excerpt), ''),
        left(regexp_replace(coalesce(m.content, ''), '<[^>]+>', ' ', 'g'), 180)
      ) as excerpt,
      'flea'::text as category,
      0::int as comment_count,
      0::int as view_count,
      case
        when m.image_urls is not null and coalesce(array_length(m.image_urls, 1), 0) >= 1 then m.image_urls[1]
        else null::text
      end as image_url
    from public.market m
    where m.moderation_status = 'safe'
      and coalesce(m.author_hidden, false) = false
      and m.status = any (array['available', 'reserved', 'sold']::text[])
    $market$;
  end if;

  v_sql :=
    'with u as (' || v_union || ')
    , filtered as (
      select * from u
      where ($1 is null and $2 is null)
         or row(u.created_at, u.id) < row($1::timestamptz, $2::uuid)
    )
    select
      f.kind::text,
      f.id,
      f.created_at,
      f.title::text,
      f.excerpt::text,
      f.category::text,
      f.comment_count::int,
      f.view_count::int,
      f.image_url::text
    from filtered f
    order by f.created_at desc, f.id desc
    limit $3';

  return query execute v_sql using cursor_created_at, cursor_id, lim;
end;
$$;

comment on function public.get_home_unified_feed(int, timestamptz, uuid) is
  'Unified home feed: posts + optional jobs/market (to_regclass), keyset (created_at,id) DESC.';

alter function public.get_home_unified_feed(int, timestamptz, uuid) owner to postgres;

grant execute on function public.get_home_unified_feed(int, timestamptz, uuid) to anon, authenticated;
