-- =============================================================
-- Migration: 001_create_bot_actions
-- Description: 봇 실행·결과 통합 로그 (Bot_Actions)
-- =============================================================
-- botActionLogger.ts / botTypes.ts 와 컬럼명·체크 제약 일치 유지
-- =============================================================

create table if not exists bot_actions (
  id               uuid        primary key default gen_random_uuid(),
  run_id           uuid        not null,
  bot_name         text        not null,
  action_type      text        not null
                   check (action_type in (
                     'collect_data', 'analyze', 'publish', 'alert', 'heal'
                   )),
  objective        text        not null,
  target_entity    text,
  target_id        text,
  status           text        not null
                   check (status in (
                     'queued', 'running', 'success', 'failed', 'skipped'
                   )),
  priority         int         not null default 3,
  input_payload    jsonb       not null default '{}',
  output_payload   jsonb       not null default '{}',
  metrics_before   jsonb       not null default '{}',
  metrics_after    jsonb       not null default '{}',
  error_code       text,
  error_message    text,
  retry_count      int         not null default 0,
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_bot_actions_bot_name_created
  on bot_actions (bot_name, created_at desc);

create index if not exists idx_bot_actions_run_id
  on bot_actions (run_id);

create index if not exists idx_bot_actions_action_type_created
  on bot_actions (action_type, created_at desc);

-- RLS: 클라이언트(anon/authenticated)는 접근 불가 — 봇·관리 API는 service_role (RLS 우회)
alter table public.bot_actions enable row level security;

drop policy if exists bot_actions_no_client_access on public.bot_actions;
create policy bot_actions_no_client_access on public.bot_actions
  for all
  to anon, authenticated
  using (false)
  with check (false);
