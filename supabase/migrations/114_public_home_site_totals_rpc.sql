-- =============================================================================
-- 114_public_home_site_totals_rpc.sql
-- 홈 우측 «필고형» 전역 통계 — anon 은 RPC EXECUTE 만 (SECURITY DEFINER).
-- public.jobs / public.market 이 없는 DB(083 미적용)에서도 오류 없이 동작.
-- =============================================================================

create or replace function public.get_public_home_site_totals()
returns table (
  profile_count bigint,
  community_item_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profiles bigint;
  v_posts bigint;
  v_jobs bigint := 0;
  v_market bigint := 0;
begin
  select count(*)::bigint into v_profiles from public.profiles;

  select count(*)::bigint
  into v_posts
  from public.posts p
  where p.moderation_status = 'safe'
    and coalesce(p.author_hidden, false) = false
    and coalesce(p.is_knowledge_tip, false) = false
    and p.category = any (array['free', 'info', 'restaurant', 'flea', 'job']::text[]);

  if to_regclass('public.jobs') is not null then
    select count(*)::bigint
    into v_jobs
    from public.jobs j
    where j.moderation_status = 'safe'
      and coalesce(j.author_hidden, false) = false;
  end if;

  if to_regclass('public.market') is not null then
    select count(*)::bigint
    into v_market
    from public.market m
    where m.moderation_status = 'safe'
      and coalesce(m.author_hidden, false) = false
      and m.status = any (array['available', 'reserved', 'sold']::text[]);
  end if;

  return query
  select
    v_profiles as profile_count,
    (v_posts + v_jobs + v_market) as community_item_count;
end;
$$;

comment on function public.get_public_home_site_totals() is
  'Public home totals: profiles; posts (hub categories) + jobs + market when those tables exist (to_regclass).';

alter function public.get_public_home_site_totals() owner to postgres;

grant execute on function public.get_public_home_site_totals() to anon, authenticated;
