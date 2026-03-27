-- =============================================================================
-- 022_pg_trgm_schema_extensions
-- Lint 0014_extension_in_public: pg_trgm 을 public 이 아닌 extensions 스키마로 둠.
-- 이미 public 에 있을 때만 이동 (이미 extensions 면 스킵).
-- =============================================================================

create schema if not exists extensions;

do $do$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm'
      and n.nspname = 'public'
  ) then
    execute 'alter extension pg_trgm set schema extensions';
  end if;
end
$do$;
