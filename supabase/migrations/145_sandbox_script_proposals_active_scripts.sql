-- =============================================================================
-- 145_sandbox_script_proposals_active_scripts.sql
-- AI·워치독 파이프라인 제안(sandbox_script_proposals) + 런타임 주입(active_scripts)
-- RLS ON · 정책 없음 → anon/authenticated 차단, service_role만 접근(바이패스)
-- =============================================================================

create table if not exists public.sandbox_script_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  description text,
  language text not null default 'typescript',
  code_text text not null,
  pipeline_kind text,
  source text not null default 'watchdog',
  status text not null default 'pending',
  trigger_context jsonb not null default '{}'::jsonb,
  external_ref text,
  constraint sandbox_script_proposals_status_ck check (status in ('pending', 'accepted', 'rejected'))
);

comment on table public.sandbox_script_proposals is
  '도커 워치독·내부 봇이 제안한 파이프라인/스크립트 초안. 오너가 관리자 샌드박스에서 검토 후 active_scripts로 주입.';

create unique index if not exists sandbox_script_proposals_external_ref_uidx
  on public.sandbox_script_proposals (external_ref)
  where external_ref is not null;

create table if not exists public.active_scripts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  title text not null,
  language text not null default 'typescript',
  code_text text not null,
  hook_target text not null default 'cron',
  enabled boolean not null default true,
  proposal_id uuid references public.sandbox_script_proposals (id) on delete set null,
  last_run_at timestamptz,
  last_run_ok boolean,
  last_run_error text,
  metadata jsonb not null default '{}'::jsonb,
  constraint active_scripts_hook_target_ck check (hook_target in ('cron', 'none'))
);

comment on table public.active_scripts is
  '오너가 승인 주입한 스크립트. 크론 등에서 로드하여 제한 실행(서버 전용).';

alter table public.sandbox_script_proposals enable row level security;
alter table public.active_scripts enable row level security;

notify pgrst, 'reload_schema';
