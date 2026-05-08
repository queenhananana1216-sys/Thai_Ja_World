-- 167_zero_warning_micro_patch.sql
-- 목표:
-- 1) Security Advisor 잔여 경고(특히 SECURITY DEFINER 실행권한) 제로화
-- 2) RLS 정책 표준화(공개/민감/관리자 전용)
-- 3) Disk IO 압력 완화 인덱스/캐시 미세튜닝

begin;

-- -----------------------------------------------------------------------------
-- A. SECURITY DEFINER 함수 실행권한 경고 전수 박멸
--    - Advisor "Signed-In Users Can Execute SECURITY DEFINER Function" 대응
-- -----------------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, extensions',
      fn.schema_name, fn.function_name, fn.identity_args
    );

    execute format('revoke execute on function %I.%I(%s) from public', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('revoke execute on function %I.%I(%s) from anon', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('revoke execute on function %I.%I(%s) from authenticated', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('grant execute on function %I.%I(%s) to service_role', fn.schema_name, fn.function_name, fn.identity_args);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- B. RLS 정책 표준화
-- -----------------------------------------------------------------------------

-- B-1) 모든 public base table RLS 강제 활성화
do $$
declare
  t record;
begin
  for t in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname not like 'pg_%'
      and c.relname not like 'sql_%'
  loop
    execute format('alter table %I.%I enable row level security', t.schema_name, t.table_name);
  end loop;
end
$$;

-- B-2) 공개 조회 테이블(읽기 공개, 쓰기 관리자 전용)
do $$
declare
  v_tbl text;
  v_public_tables text[] := array[
    'processed_news',
    'tips',
    'korean_businesses',
    'site_settings',
    'exchange_rates',
    'spline_scenes',
    'polls'
  ];
begin
  foreach v_tbl in array v_public_tables
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_tbl
    ) then
      execute format('drop policy if exists rls167_%I_select_public on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_select_public on public.%I for select to anon, authenticated using (true)',
        v_tbl, v_tbl
      );

      execute format('drop policy if exists rls167_%I_mod_none_auth on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_mod_none_auth on public.%I for all to authenticated using (false) with check (false)',
        v_tbl, v_tbl
      );

      execute format('drop policy if exists rls167_%I_mod_none_anon on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_mod_none_anon on public.%I for all to anon using (false) with check (false)',
        v_tbl, v_tbl
      );

      execute format('drop policy if exists rls167_%I_sr_all on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_sr_all on public.%I for all to service_role using (true) with check (true)',
        v_tbl, v_tbl
      );
    end if;
  end loop;
end
$$;

-- B-3) 민감 테이블(본인만 조회/수정, 관리자 전체)
do $$
begin
  -- profiles
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    drop policy if exists rls167_profiles_select_own on public.profiles;
    create policy rls167_profiles_select_own
      on public.profiles for select to authenticated using (auth.uid() = id);

    drop policy if exists rls167_profiles_insert_own on public.profiles;
    create policy rls167_profiles_insert_own
      on public.profiles for insert to authenticated with check (auth.uid() = id);

    drop policy if exists rls167_profiles_update_own on public.profiles;
    create policy rls167_profiles_update_own
      on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

    drop policy if exists rls167_profiles_delete_none on public.profiles;
    create policy rls167_profiles_delete_none
      on public.profiles for delete to authenticated using (false);

    drop policy if exists rls167_profiles_sr_all on public.profiles;
    create policy rls167_profiles_sr_all
      on public.profiles for all to service_role using (true) with check (true);
  end if;

  -- dotori_ledger
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='dotori_ledger') then
    drop policy if exists rls167_dotori_ledger_select_own on public.dotori_ledger;
    create policy rls167_dotori_ledger_select_own
      on public.dotori_ledger for select to authenticated using (auth.uid() = profile_id);

    drop policy if exists rls167_dotori_ledger_insert_none on public.dotori_ledger;
    create policy rls167_dotori_ledger_insert_none
      on public.dotori_ledger for insert to authenticated with check (false);

    drop policy if exists rls167_dotori_ledger_update_none on public.dotori_ledger;
    create policy rls167_dotori_ledger_update_none
      on public.dotori_ledger for update to authenticated using (false) with check (false);

    drop policy if exists rls167_dotori_ledger_delete_none on public.dotori_ledger;
    create policy rls167_dotori_ledger_delete_none
      on public.dotori_ledger for delete to authenticated using (false);

    drop policy if exists rls167_dotori_ledger_sr_all on public.dotori_ledger;
    create policy rls167_dotori_ledger_sr_all
      on public.dotori_ledger for all to service_role using (true) with check (true);
  end if;
end
$$;

-- B-4) 관리자 전용 테이블(로그/오류) 완전 차단 + service_role only
do $$
declare
  v_tbl text;
  v_admin_only_tables text[] := array[
    'pipeline_error_events',
    'search_logs',
    'user_activity_logs',
    'site_analytics',
    'audit_logs',
    'admin_action_logs'
  ];
begin
  foreach v_tbl in array v_admin_only_tables
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_tbl
    ) then
      execute format('drop policy if exists rls167_%I_no_access_anon on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_no_access_anon on public.%I for all to anon using (false) with check (false)',
        v_tbl, v_tbl
      );

      execute format('drop policy if exists rls167_%I_no_access_auth on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_no_access_auth on public.%I for all to authenticated using (false) with check (false)',
        v_tbl, v_tbl
      );

      execute format('drop policy if exists rls167_%I_sr_all on public.%I', v_tbl, v_tbl);
      execute format(
        'create policy rls167_%I_sr_all on public.%I for all to service_role using (true) with check (true)',
        v_tbl, v_tbl
      );
    end if;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- C. Disk IO 튜닝: 병목 가시화 + 인덱스 보강
-- -----------------------------------------------------------------------------
create extension if not exists pg_stat_statements with schema extensions;

create or replace view public.admin_io_hot_queries_top5 as
select
  s.queryid,
  s.calls,
  round(s.total_exec_time::numeric, 2) as total_exec_ms,
  round(s.mean_exec_time::numeric, 2) as mean_exec_ms,
  s.rows,
  s.shared_blks_read,
  s.shared_blks_hit,
  s.temp_blks_read,
  s.temp_blks_written,
  (coalesce(s.shared_blks_read, 0) + coalesce(s.temp_blks_read, 0)) as io_pressure,
  left(regexp_replace(s.query, '\s+', ' ', 'g'), 1200) as query_sample
from pg_stat_statements s
where s.query not ilike '%pg_stat_statements%'
order by (coalesce(s.shared_blks_read, 0) + coalesce(s.temp_blks_read, 0)) desc, s.total_exec_time desc
limit 5;

revoke all on public.admin_io_hot_queries_top5 from public, anon, authenticated;
grant select on public.admin_io_hot_queries_top5 to service_role;

-- 인덱스 보강 (존재할 때만)
do $$
begin
  -- processed_news
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='created_at') then
    execute 'create index if not exists idx167_processed_news_created_desc on public.processed_news (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='is_published')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='created_at') then
    execute 'create index if not exists idx167_processed_news_pub_created on public.processed_news (is_published, created_at desc)';
  end if;

  -- logs
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='created_at') then
    execute 'create index if not exists idx167_search_logs_created_desc on public.search_logs (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='query_norm')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='created_at') then
    execute 'create index if not exists idx167_search_logs_querynorm_created on public.search_logs (query_norm, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_activity_logs' and column_name='created_at') then
    execute 'create index if not exists idx167_user_activity_logs_created_desc on public.user_activity_logs (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pipeline_error_events' and column_name='scope')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='pipeline_error_events' and column_name='created_at') then
    execute 'create index if not exists idx167_pipeline_error_scope_created on public.pipeline_error_events (scope, created_at desc)';
  end if;

  -- korean_businesses
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='korean_businesses' and column_name='region')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='korean_businesses' and column_name='category') then
    execute 'create index if not exists idx167_korean_businesses_region_category on public.korean_businesses (region, category)';
  end if;

  -- dotori ledger
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dotori_ledger' and column_name='profile_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='dotori_ledger' and column_name='created_at') then
    execute 'create index if not exists idx167_dotori_ledger_profile_created on public.dotori_ledger (profile_id, created_at desc)';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- D. 캐시 최적화(자주 읽는 집계/순위형 조회)
-- -----------------------------------------------------------------------------
create schema if not exists cache;

-- 게시글 일간 랭킹 캐시 MV (posts + reaction/comment/view 기반)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='posts') then
    execute $q$
      create materialized view if not exists cache.daily_post_ranking_mv as
      select
        p.id,
        p.created_at::date as day_key,
        coalesce(p.view_count, 0)::bigint as view_count,
        coalesce(p.comment_count, 0)::bigint as comment_count,
        (coalesce(p.view_count, 0)::bigint + coalesce(p.comment_count, 0)::bigint * 2) as score
      from public.posts p
      where p.created_at >= now() - interval '14 days'
    $q$;

    execute 'create unique index if not exists idx167_daily_post_ranking_mv_id_day on cache.daily_post_ranking_mv (id, day_key)';
    execute 'create index if not exists idx167_daily_post_ranking_mv_score on cache.daily_post_ranking_mv (day_key desc, score desc)';
  end if;
end
$$;

create or replace function public.refresh_daily_post_ranking_cache()
returns void
language plpgsql
security definer
set search_path = public, cache, extensions
as $$
begin
  if exists (
    select 1
    from pg_matviews
    where schemaname = 'cache'
      and matviewname = 'daily_post_ranking_mv'
  ) then
    refresh materialized view concurrently cache.daily_post_ranking_mv;
  end if;
end;
$$;

revoke all on function public.refresh_daily_post_ranking_cache() from public, anon, authenticated;
grant execute on function public.refresh_daily_post_ranking_cache() to service_role;

-- 통계 최신화
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='processed_news') then execute 'analyze public.processed_news'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='posts') then execute 'analyze public.posts'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='search_logs') then execute 'analyze public.search_logs'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='user_activity_logs') then execute 'analyze public.user_activity_logs'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pipeline_error_events') then execute 'analyze public.pipeline_error_events'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='korean_businesses') then execute 'analyze public.korean_businesses'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='dotori_ledger') then execute 'analyze public.dotori_ledger'; end if;
end
$$;

commit;
