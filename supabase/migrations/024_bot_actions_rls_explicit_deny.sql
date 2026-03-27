-- =============================================================================
-- 024_bot_actions_rls_explicit_deny
-- Lint 0008_rls_enabled_no_policy: RLS 만 켜고 정책이 없으면 어드바이저가 경고.
-- 의도: 봇 실행 로그는 API(anon/authenticated)에서 접근 불가, service_role 만 사용(RLS 우회).
-- anon/authenticated 에 대해 FOR ALL + false 로 의도를 명시 (동작은 기존과 동일하게 차단).
-- =============================================================================

alter table public.bot_actions enable row level security;

drop policy if exists bot_actions_no_client_access on public.bot_actions;
create policy bot_actions_no_client_access on public.bot_actions
  for all
  to anon, authenticated
  using (false)
  with check (false);
