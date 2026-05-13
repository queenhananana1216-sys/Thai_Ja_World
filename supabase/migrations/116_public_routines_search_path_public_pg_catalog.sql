-- 116_public_routines_search_path_public_pg_catalog
-- Lint 0011: set search_path to public, pg_catalog (supplements 112).

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as proc, p.prokind
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from pg_catalog.pg_depend d
        where d.objid = p.oid
          and d.deptype = 'e'
          and d.refclassid = 'pg_extension'::regclass
      )
  loop
    if r.prokind = 'p' then
      execute format('alter procedure %s set search_path to public, pg_catalog', r.proc);
    else
      execute format('alter function %s set search_path to public, pg_catalog', r.proc);
    end if;
  end loop;
end
$$;
