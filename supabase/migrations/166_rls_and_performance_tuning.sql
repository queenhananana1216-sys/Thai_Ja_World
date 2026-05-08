-- 166_rls_and_performance_tuning.sql
-- 목표:
-- 1) Auth RLS Initialization Plan 경고(미정책 테이블) 일괄 잠금
-- 2) 핵심 민감 테이블(profiles, dotori_ledger, korean_businesses) 엄격 정책 적용
-- 3) Disk IO 병목 추적 + 인덱스 최적화

begin;

-- -----------------------------------------------------------------------------
-- A. RLS 일괄 활성화 + 기본 정책 자동 생성
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
  v_has_policy boolean;
  v_owner_col text;
  v_suffix text;
begin
  for t in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p') -- table, partitioned table
      and c.relname not like 'pg_%'
      and c.relname not like 'sql_%'
  loop
    execute format('alter table %I.%I enable row level security', t.schema_name, t.table_name);

    select exists (
      select 1
      from pg_policies p
      where p.schemaname = t.schema_name
        and p.tablename = t.table_name
    ) into v_has_policy;

    -- 기존 정책이 있는 테이블은 존중하고 건너뜀
    if v_has_policy then
      continue;
    end if;

    v_suffix := substring(md5(t.schema_name || '.' || t.table_name), 1, 10);

    -- service_role 긴급 운영/복구 경로는 유지
    execute format('drop policy if exists rls166_sr_all_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
    execute format(
      'create policy rls166_sr_all_%s on %I.%I for all to service_role using (true) with check (true)',
      v_suffix, t.schema_name, t.table_name
    );

    -- 소유자 컬럼 탐지: own-row 정책 자동 부여
    select a.attname
      into v_owner_col
    from pg_attribute a
    where a.attrelid = format('%I.%I', t.schema_name, t.table_name)::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attname in ('profile_id', 'user_id', 'owner_id', 'author_id', 'created_by', 'id')
    order by case a.attname
      when 'profile_id' then 1
      when 'user_id' then 2
      when 'owner_id' then 3
      when 'author_id' then 4
      when 'created_by' then 5
      when 'id' then 99
      else 100
    end
    limit 1;

    if v_owner_col is not null then
      execute format('drop policy if exists rls166_auth_sel_own_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_sel_own_%s on %I.%I for select to authenticated using (auth.uid() = %I)',
        v_suffix, t.schema_name, t.table_name, v_owner_col
      );

      execute format('drop policy if exists rls166_auth_ins_own_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_ins_own_%s on %I.%I for insert to authenticated with check (auth.uid() = %I)',
        v_suffix, t.schema_name, t.table_name, v_owner_col
      );

      execute format('drop policy if exists rls166_auth_upd_own_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_upd_own_%s on %I.%I for update to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',
        v_suffix, t.schema_name, t.table_name, v_owner_col, v_owner_col
      );

      execute format('drop policy if exists rls166_auth_del_own_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_del_own_%s on %I.%I for delete to authenticated using (auth.uid() = %I)',
        v_suffix, t.schema_name, t.table_name, v_owner_col
      );
    else
      -- 소유자 컬럼이 없으면 기본 잠금(인증 사용자도 읽기/쓰기 금지, 서비스 롤만 허용)
      execute format('drop policy if exists rls166_auth_sel_none_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_sel_none_%s on %I.%I for select to authenticated using (false)',
        v_suffix, t.schema_name, t.table_name
      );

      execute format('drop policy if exists rls166_auth_mod_none_%s on %I.%I', v_suffix, t.schema_name, t.table_name);
      execute format(
        'create policy rls166_auth_mod_none_%s on %I.%I for all to authenticated using (false) with check (false)',
        v_suffix, t.schema_name, t.table_name
      );
    end if;
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- B. 핵심 민감 테이블 엄격 정책 (요청사항 강제)
-- -----------------------------------------------------------------------------
alter table if exists public.profiles enable row level security;
alter table if exists public.dotori_ledger enable row level security;
alter table if exists public.korean_businesses enable row level security;

-- profiles: 본인만 조회/수정, 서비스 롤 전체 허용
drop policy if exists profiles_sel_own_166 on public.profiles;
create policy profiles_sel_own_166
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_upd_own_166 on public.profiles;
create policy profiles_upd_own_166
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists profiles_ins_none_166 on public.profiles;
create policy profiles_ins_none_166
  on public.profiles
  for insert
  to authenticated
  with check (false);

drop policy if exists profiles_del_none_166 on public.profiles;
create policy profiles_del_none_166
  on public.profiles
  for delete
  to authenticated
  using (false);

drop policy if exists profiles_sr_all_166 on public.profiles;
create policy profiles_sr_all_166
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

-- dotori_ledger: 본인 행만 조회, 직접 쓰기 차단(서비스 롤/서버 함수만 기록)
drop policy if exists dotori_ledger_sel_own_166 on public.dotori_ledger;
create policy dotori_ledger_sel_own_166
  on public.dotori_ledger
  for select
  to authenticated
  using (auth.uid() = profile_id);

drop policy if exists dotori_ledger_no_insert_166 on public.dotori_ledger;
create policy dotori_ledger_no_insert_166
  on public.dotori_ledger
  for insert
  to authenticated
  with check (false);

drop policy if exists dotori_ledger_no_update_166 on public.dotori_ledger;
create policy dotori_ledger_no_update_166
  on public.dotori_ledger
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists dotori_ledger_no_delete_166 on public.dotori_ledger;
create policy dotori_ledger_no_delete_166
  on public.dotori_ledger
  for delete
  to authenticated
  using (false);

drop policy if exists dotori_ledger_sr_all_166 on public.dotori_ledger;
create policy dotori_ledger_sr_all_166
  on public.dotori_ledger
  for all
  to service_role
  using (true)
  with check (true);

-- korean_businesses: anon 완전 차단, authenticated 읽기만 허용, 쓰기는 서비스 롤만
drop policy if exists korean_businesses_sel_auth_166 on public.korean_businesses;
create policy korean_businesses_sel_auth_166
  on public.korean_businesses
  for select
  to authenticated
  using (true);

drop policy if exists korean_businesses_mod_none_auth_166 on public.korean_businesses;
create policy korean_businesses_mod_none_auth_166
  on public.korean_businesses
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists korean_businesses_sr_all_166 on public.korean_businesses;
create policy korean_businesses_sr_all_166
  on public.korean_businesses
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.profiles from anon;
revoke all on table public.dotori_ledger from anon;
revoke all on table public.korean_businesses from anon;
grant select on table public.profiles to authenticated;
grant select on table public.dotori_ledger to authenticated;
grant select on table public.korean_businesses to authenticated;
grant all on table public.profiles to service_role;
grant all on table public.dotori_ledger to service_role;
grant all on table public.korean_businesses to service_role;

-- -----------------------------------------------------------------------------
-- C. Disk IO 병목 진단 (pg_stat_statements 상위 5개)
-- -----------------------------------------------------------------------------
create extension if not exists pg_stat_statements with schema extensions;

create or replace view public.admin_disk_io_top5 as
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
  (coalesce(s.shared_blks_read, 0) + coalesce(s.temp_blks_read, 0)) as disk_read_pressure,
  left(regexp_replace(s.query, '\s+', ' ', 'g'), 1000) as query_sample
from pg_stat_statements s
where s.query not ilike '%pg_stat_statements%'
order by (coalesce(s.shared_blks_read, 0) + coalesce(s.temp_blks_read, 0)) desc, s.total_exec_time desc
limit 5;

comment on view public.admin_disk_io_top5 is
  'Disk IO 압력을 유발하는 상위 5개 쿼리(공유블록 읽기 + temp 읽기 기준)';

-- 운영 진단은 서버 측만 허용
revoke all on public.admin_disk_io_top5 from public, anon, authenticated;
grant select on public.admin_disk_io_top5 to service_role;

-- -----------------------------------------------------------------------------
-- D. 고빈도 스캔 후보 인덱스 보강 (테이블/컬럼 존재 시에만)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='created_at') then
    execute 'create index if not exists idx_processed_news_created_at_desc on public.processed_news (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='is_published')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='created_at') then
    execute 'create index if not exists idx_processed_news_published_created on public.processed_news (is_published, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='created_at') then
    execute 'create index if not exists idx_posts_created_at_desc on public.posts (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='author_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='created_at') then
    execute 'create index if not exists idx_posts_author_created_at_desc on public.posts (author_id, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='created_at') then
    execute 'create index if not exists idx_search_logs_created_at_desc on public.search_logs (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='profile_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='created_at') then
    execute 'create index if not exists idx_search_logs_profile_created on public.search_logs (profile_id, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_activity_logs' and column_name='created_at') then
    execute 'create index if not exists idx_user_activity_logs_created_at_desc on public.user_activity_logs (created_at desc)';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_activity_logs' and column_name='activity_type')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_activity_logs' and column_name='created_at') then
    execute 'create index if not exists idx_user_activity_logs_kind_created on public.user_activity_logs (activity_type, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='pipeline_error_events' and column_name='created_at') then
    execute 'create index if not exists idx_pipeline_error_events_created_at_desc on public.pipeline_error_events (created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='dotori_ledger' and column_name='profile_id')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='dotori_ledger' and column_name='created_at') then
    execute 'create index if not exists idx_dotori_ledger_profile_created on public.dotori_ledger (profile_id, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='updated_at') then
    execute 'create index if not exists idx_profiles_updated_at_desc on public.profiles (updated_at desc)';
  end if;
end
$$;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='processed_news') then execute 'analyze public.processed_news'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='posts') then execute 'analyze public.posts'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='search_logs') then execute 'analyze public.search_logs'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='user_activity_logs') then execute 'analyze public.user_activity_logs'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='pipeline_error_events') then execute 'analyze public.pipeline_error_events'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='dotori_ledger') then execute 'analyze public.dotori_ledger'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then execute 'analyze public.profiles'; end if;
end
$$;

commit;
