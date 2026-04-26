-- =============================================================================
-- 113_public_ux_metrics_latest_rpc.sql
-- 홈·포털 RSC(anon)에서 최근 5분 UX 집계 스냅샷만 노출 — 원테이블 SELECT는 RLS로 차단 유지.
-- =============================================================================

create or replace function public.get_public_ux_metrics_latest()
returns table (
  window_start timestamptz,
  totals jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select m.window_start, m.totals
  from public.ux_metrics_5m m
  order by m.window_start desc
  limit 1;
$$;

comment on function public.get_public_ux_metrics_latest() is
  'Latest UX 5m rollup (definer): page_view/click/dead_click 등 totals JSON — anon EXECUTE only.';

alter function public.get_public_ux_metrics_latest() owner to postgres;

grant execute on function public.get_public_ux_metrics_latest() to anon, authenticated;
