import 'server-only';

/**
 * Vercel Cron: Authorization: Bearer <CRON_SECRET>
 * 로컬에서 CRON_SECRET 미설정 시 검증 생략.
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  return authHeader === `Bearer ${secret}`;
}
