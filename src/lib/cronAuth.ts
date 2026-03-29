import 'server-only';

/**
 * Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출합니다.
 * POST /api/bot/* 수동 트리거도 동일 헤더가 필요합니다(CRON_SECRET 또는 BOT_CRON_SECRET 설정 시).
 * 로컬에서 둘 다 없으면 검증 생략(개발 편의).
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!secret) return true;
  return authHeader === `Bearer ${secret}`;
}
