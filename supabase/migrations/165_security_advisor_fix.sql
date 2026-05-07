-- Security Advisor 무결성 패치
begin;

-- 1) public SECURITY DEFINER 함수 전수 보호
do $$
declare
  fn record;
begin
  for fn in
    select n.nspname as schema_name,
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
    execute format('grant execute on function %I.%I(%s) to authenticated', fn.schema_name, fn.function_name, fn.identity_args);
    execute format('grant execute on function %I.%I(%s) to service_role', fn.schema_name, fn.function_name, fn.identity_args);
  end loop;
end
$$;

-- 2) 명시된 핵심 함수 재보강 (존재 시)
do $$
declare
  target_name text;
  fn record;
begin
  foreach target_name in array array[
    'get_home_unified_feed',
    'apply_dotori_ledger',
    'claim_daily_thailand_fortune',
    'dotori_daily_checkin'
  ]
  loop
    for fn in
      select n.nspname as schema_name,
             p.proname as function_name,
             pg_get_function_identity_arguments(p.oid) as identity_args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = target_name
    loop
      execute format('alter function %I.%I(%s) set search_path = public, extensions', fn.schema_name, fn.function_name, fn.identity_args);
      execute format('revoke execute on function %I.%I(%s) from public', fn.schema_name, fn.function_name, fn.identity_args);
      execute format('revoke execute on function %I.%I(%s) from anon', fn.schema_name, fn.function_name, fn.identity_args);
      execute format('grant execute on function %I.%I(%s) to authenticated', fn.schema_name, fn.function_name, fn.identity_args);
      execute format('grant execute on function %I.%I(%s) to service_role', fn.schema_name, fn.function_name, fn.identity_args);
    end loop;
  end loop;
end
$$;

-- 3) SECURITY DEFINER VIEW 경고 완화 (Postgres15+)
do $$
declare
  vw record;
begin
  for vw in
    select n.nspname as schema_name, c.relname as view_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
  loop
    execute format('alter view %I.%I set (security_invoker = true)', vw.schema_name, vw.view_name);
  end loop;
end
$$;

-- 4) 429/Quota vs 권한(42501) 정밀 진단
create or replace function public.pipeline_error_security_quota_diagnostics(
  p_window interval default interval '24 hours'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_total bigint := 0;
  v_quota bigint := 0;
  v_429 bigint := 0;
  v_permission bigint := 0;
begin
  select count(*) into v_total
  from public.pipeline_error_events
  where created_at >= now() - p_window;

  select count(*) into v_quota
  from public.pipeline_error_events
  where created_at >= now() - p_window
    and (coalesce(reason_code,'') ilike '%quota%'
      or coalesce(message_excerpt,'') ilike '%quota%'
      or coalesce(meta->>'status_code','') = '429'
      or coalesce(meta->>'http_status','') = '429');

  select count(*) into v_429
  from public.pipeline_error_events
  where created_at >= now() - p_window
    and (coalesce(reason_code,'') = '429'
      or coalesce(message_excerpt,'') ilike '%429%'
      or coalesce(meta->>'status_code','') = '429'
      or coalesce(meta->>'http_status','') = '429');

  select count(*) into v_permission
  from public.pipeline_error_events
  where created_at >= now() - p_window
    and (coalesce(reason_code,'') ilike '%permission%'
      or coalesce(reason_code,'') ilike '%42501%'
      or coalesce(message_excerpt,'') ilike '%permission denied%'
      or coalesce(message_excerpt,'') ilike '%42501%'
      or coalesce(meta->>'sqlstate','') = '42501');

  return jsonb_build_object(
    'window', p_window::text,
    'total_events', v_total,
    'quota_related_events', v_quota,
    'http_429_events', v_429,
    'permission_related_events', v_permission,
    'dominant_root_cause',
      case
        when (v_quota + v_429) > v_permission then 'BILLING_OR_QUOTA'
        when v_permission > (v_quota + v_429) then 'DB_PERMISSION_OR_RLS'
        else 'MIXED_OR_INSUFFICIENT_SIGNAL'
      end
  );
end;
$$;

revoke all on function public.pipeline_error_security_quota_diagnostics(interval) from public;
revoke all on function public.pipeline_error_security_quota_diagnostics(interval) from anon;
grant execute on function public.pipeline_error_security_quota_diagnostics(interval) to authenticated, service_role;

-- 5) 권한 오류 이벤트 자가치유 메타 마킹
create or replace function public.self_heal_pipeline_permission_blocks(
  p_window interval default interval '24 hours',
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated bigint := 0;
begin
  with candidate as (
    select id
    from public.pipeline_error_events
    where created_at >= now() - p_window
      and (
        coalesce(reason_code,'') ilike '%permission%'
        or coalesce(reason_code,'') ilike '%42501%'
        or coalesce(message_excerpt,'') ilike '%permission denied%'
        or coalesce(message_excerpt,'') ilike '%42501%'
        or coalesce(meta->>'sqlstate','') = '42501'
      )
      and coalesce(meta->>'self_healed','false') <> 'true'
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  )
  update public.pipeline_error_events e
  set meta = coalesce(e.meta, '{}'::jsonb)
           || jsonb_build_object(
             'self_healed', true,
             'healed_at', now(),
             'healing_action', 'security_advisor_patch_165_recheck_function_grants'
           )
  from candidate c
  where e.id = c.id;

  get diagnostics v_updated = row_count;

  return jsonb_build_object(
    'ok', true,
    'updated_events', v_updated,
    'next', 'Run pipeline_error_security_quota_diagnostics() to validate dominant cause'
  );
end;
$$;

revoke all on function public.self_heal_pipeline_permission_blocks(interval, int) from public;
revoke all on function public.self_heal_pipeline_permission_blocks(interval, int) from anon;
grant execute on function public.self_heal_pipeline_permission_blocks(interval, int) to service_role;

commit;
