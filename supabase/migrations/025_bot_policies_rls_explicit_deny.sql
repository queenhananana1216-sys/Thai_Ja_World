-- =============================================================================
-- 025_bot_policies_rls_explicit_deny
-- Lint 0008_rls_enabled_no_policy: bot_policies 는 Phase 3 관리용, API 클라이언트 접근 없음.
-- anon/authenticated 에 명시적 차단 — 읽기/쓰기는 service_role (RLS 우회).
-- =============================================================================

alter table public.bot_policies enable row level security;

drop policy if exists bot_policies_no_client_access on public.bot_policies;
create policy bot_policies_no_client_access on public.bot_policies
  for all
  to anon, authenticated
  using (false)
  with check (false);
