-- =============================================================================
-- 078_ux_tracking_and_flags.sql
-- - UX 이벤트 수집
-- - 5분 집계 저장
-- - 봇이 조정할 UI 플래그 저장소(공개 읽기)
-- =============================================================================

create table if not exists public.ux_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  locale text not null default 'ko',
  path text not null,
  event_type text not null
    check (event_type in ('page_view', 'click', 'dead_click', 'js_error', 'api_error')),
  target_text text,
  target_role text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ux_events_created_idx on public.ux_events (created_at desc);
create index if not exists ux_events_path_created_idx on public.ux_events (path, created_at desc);
create index if not exists ux_events_type_created_idx on public.ux_events (event_type, created_at desc);

alter table public.ux_events enable row level security;
drop policy if exists ux_events_select_none on public.ux_events;
create policy ux_events_select_none on public.ux_events
  for select to authenticated
  using (false);

create table if not exists public.ux_metrics_5m (
  window_start timestamptz primary key,
  totals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ux_metrics_5m enable row level security;
drop policy if exists ux_metrics_select_none on public.ux_metrics_5m;
create policy ux_metrics_select_none on public.ux_metrics_5m
  for select to authenticated
  using (false);

create table if not exists public.ux_flag_overrides (
  flag_key text primary key,
  flag_value jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  reason text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create index if not exists ux_flag_overrides_active_idx
  on public.ux_flag_overrides (active, updated_at desc);

alter table public.ux_flag_overrides enable row level security;

drop policy if exists ux_flags_public_read on public.ux_flag_overrides;
create policy ux_flags_public_read on public.ux_flag_overrides
  for select to anon, authenticated
  using (active = true);

grant select on table public.ux_flag_overrides to anon, authenticated;

