import 'server-only';

/**
 * Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출합니다.
 * POST /api/bot/* 수동 트리거도 동일 헤더가 필요합니다(CRON_SECRET 또는 BOT_CRON_SECRET 설정 시).
 * 로컬에서 둘 다 없으면 검증 생략(개발 편의).
 * 시크릿 교체 시: Vercel·로컬 `.env.local` 저장 후 재배포(또는 `next dev` 재시작)하면 `process.env`에 즉시 반영됩니다.
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!secret) return true;

  const raw = authHeader?.trim();
  if (!raw) return false;

  const m = /^Bearer\s+(.+)$/i.exec(raw);
  if (!m?.[1]) return false;

  const token = m[1].trim();
  return token === secret;
}
