-- 167a_ultra_fix.sql
-- Final seal:
-- 1) SECURITY DEFINER 실행 권한 경고 정리
-- 2) RLS 충돌 완화용 스캐너 이벤트 저장소 추가
-- 3) Disk IO 압력 완화 인덱스 미세 패치

begin;

-- -----------------------------------------------------------------------------
-- 1) SECURITY DEFINER: signed-in 실행 경고 차단 (service_role only)
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
    execute format('alter function %I.%I(%s) set search_path = public, extensions', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('revoke execute on function %I.%I(%s) from public', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('revoke execute on function %I.%I(%s) from anon', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('revoke execute on function %I.%I(%s) from authenticated', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('grant execute on function %I.%I(%s) to service_role', fn.schema_name, fn.function_name, fn.identity_args);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 2) E2E 라이브 스캐너 이벤트 테이블
-- -----------------------------------------------------------------------------
create table if not exists public.live_integrity_scan_events (
  id uuid primary key default gen_random_uuid(),
  scan_scope text not null default 'site_e2e_hourly',
  status text not null check (status in ('healthy', 'degraded', 'error')),
  slow_api_count int not null default 0,
  cookie_fail_count int not null default 0,
  write_fail_count int not null default 0,
  route_fail_count int not null default 0,
  auto_heal_triggered boolean not null default false,
  auto_heal_note text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_live_integrity_scan_events_scope_created
  on public.live_integrity_scan_events (scan_scope, created_at desc);

create index if not exists idx_live_integrity_scan_events_status_created
  on public.live_integrity_scan_events (status, created_at desc);

alter table public.live_integrity_scan_events enable row level security;
revoke all on public.live_integrity_scan_events from public;
revoke all on public.live_integrity_scan_events from anon, authenticated;
grant select, insert, update, delete on public.live_integrity_scan_events to service_role;

create table if not exists public.system_write_probes (
  id uuid primary key default gen_random_uuid(),
  probe_kind text not null,
  ok boolean not null default true,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_system_write_probes_kind_created
  on public.system_write_probes (probe_kind, created_at desc);

alter table public.system_write_probes enable row level security;
revoke all on public.system_write_probes from public;
revoke all on public.system_write_probes from anon, authenticated;
grant select, insert, delete on public.system_write_probes to service_role;

-- -----------------------------------------------------------------------------
-- 3) Disk IO 완화용 보강 인덱스 (존재 시에만)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='published_at')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='processed_news' and column_name='created_at') then
    execute 'create index if not exists idx167a_processed_news_published_created on public.processed_news (published_at desc, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='tips' and column_name='is_active')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='tips' and column_name='locale') then
    execute 'create index if not exists idx167a_tips_active_locale_created on public.tips (is_active, locale, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='korean_businesses' and column_name='is_verified')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='korean_businesses' and column_name='last_verified_at') then
    execute 'create index if not exists idx167a_korean_businesses_verified_last on public.korean_businesses (is_verified, last_verified_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='board_posts' and column_name='created_at')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='board_posts' and column_name='moderation_status') then
    execute 'create index if not exists idx167a_board_posts_moderation_created on public.board_posts (moderation_status, created_at desc)';
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='created_at')
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='search_logs' and column_name='query_norm') then
    execute 'create index if not exists idx167a_search_logs_query_created on public.search_logs (query_norm, created_at desc)';
  end if;
end
$$;

commit;
