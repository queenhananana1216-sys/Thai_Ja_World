-- Schema-Aware Pipeline: live column list for omni-radar (service_role only)

create or replace function public.schema_radar_public_table_columns(p_table text)
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.column_name::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table
  order by c.ordinal_position;
$$;

comment on function public.schema_radar_public_table_columns(text) is
  'Omni-radar: public 테이블 컬럼명 나열. service_role 전용 — 타입·폼 계약 드리프트 감지.';

revoke all on function public.schema_radar_public_table_columns(text) from public;
grant execute on function public.schema_radar_public_table_columns(text) to service_role;

alter function public.schema_radar_public_table_columns(text) owner to postgres;
