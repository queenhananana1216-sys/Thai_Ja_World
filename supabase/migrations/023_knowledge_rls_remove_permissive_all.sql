-- =============================================================================
-- 023_knowledge_rls_remove_permissive_all
-- FOR ALL + USING(true)/WITH CHECK(true) 이 TO 절 없이 생성되면 **모든 역할**(anon 포함)에
-- 전면 개방과 동일 → 린트 및 보안상 제거.
-- Supabase service_role 은 RLS 를 우회하므로 "service 전용 쓰기" 정책은 불필요하며 위험함.
-- 남는 정책: 각 테이블의 SELECT 전용(공개 읽기)만 유지.
-- =============================================================================

drop policy if exists "knowledge_sources: service role full access" on public.knowledge_sources;

drop policy if exists "raw_knowledge: service role write" on public.raw_knowledge;

drop policy if exists "processed_knowledge: service role full" on public.processed_knowledge;

drop policy if exists "knowledge_summaries: service role write" on public.knowledge_summaries;
