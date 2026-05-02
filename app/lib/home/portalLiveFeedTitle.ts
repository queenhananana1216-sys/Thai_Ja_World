/**
 * 홈 실시간 통합 피드 — 시스템 퀘스트/미션 제목은 메인 노출에서 제외.
 * (`fetchPortalHomeFeed` SSR + `Portal2026View` 방어적 필터 공용)
 */
export function isQuestMissionNoiseTitle(title: string): boolean {
  const t = String(title ?? '').trim();
  if (!t) return false;
  if (t.includes('[일일 미션]') || t.includes('[주간 미션]')) return true;
  if (/\[\s*[Qq]uest\s*\]/u.test(t)) return true;
  return false;
}
