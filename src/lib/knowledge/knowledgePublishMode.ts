/**
 * knowledgePublishMode.ts
 *
 * KNOWLEDGE_PUBLISH_MODE:
 *   manual (권장) — LLM 저장 직후 published=false 초안만 저장 → /admin/knowledge 에서 승인 후 공개
 *   auto           — published=true 로 즉시 공개
 */
export function knowledgeInsertAsPublished(): boolean {
  const m = process.env.KNOWLEDGE_PUBLISH_MODE?.trim().toLowerCase();
  if (m === 'manual' || m === 'review' || m === 'draft') return false;
  // auto 또는 미설정: 기본이 false(안전) — 명시적으로 'auto'여야 true
  if (m === 'auto') return true;
  return false; // 미설정은 manual과 동일하게 안전하게 false
}
