-- =============================================================================
-- 026_knowledge_sources_rls_explicit_deny
-- Lint 0008_rls_enabled_no_policy: knowledge_sources 는 파이프라인·관리 전용.
-- anon/authenticated 명시 차단 — 쓰기/시드는 service_role (RLS 우회).
-- =============================================================================

alter table public.knowledge_sources enable row level security;

drop policy if exists knowledge_sources_no_client_access on public.knowledge_sources;
create policy knowledge_sources_no_client_access on public.knowledge_sources
  for all
  to anon, authenticated
  using (false)
  with check (false);
