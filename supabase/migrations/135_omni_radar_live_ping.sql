-- Cheap SELECT 1–style probe for /api/health/omni-radar live tier (service_role only).
create or replace function public.omni_radar_live_ping()
returns smallint
language sql
security invoker
set search_path = public
stable
as $$
  select 1::smallint;
$$;

comment on function public.omni_radar_live_ping() is 'Omni-radar live DB heartbeat; not exposed to anon REST if execute is service_role-only.';

revoke all on function public.omni_radar_live_ping() from public;
grant execute on function public.omni_radar_live_ping() to service_role;
