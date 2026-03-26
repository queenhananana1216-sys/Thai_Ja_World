/**
 * NEWS_PUBLISH_MODE:
 *   auto (기본) — LLM 저장 직후 홈에 노출
 *   manual — published=false 로만 저장, /admin/news 에서 승인 후 공개
 */
export function newsInsertAsPublished(): boolean {
  const m = process.env.NEWS_PUBLISH_MODE?.trim().toLowerCase();
  if (m === 'manual' || m === 'review' || m === 'draft') return false;
  return true;
}
