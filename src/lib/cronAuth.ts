import 'server-only';

/**
 * Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 로 호출합니다.
 * POST /api/bot/* 수동 트리거도 동일 헤더가 필요합니다(CRON_SECRET 또는 BOT_CRON_SECRET 설정 시).
 * 로컬에서 둘 다 없으면 검증 생략(개발 편의).
 * 시크릿 교체 시: Vercel·로컬 `.env.local` 저장 후 재배포(또는 `next dev` 재시작)하면 `process.env`에 즉시 반영됩니다.
 */

function stripEnvNoise(s: string): string {
  return s
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/** Dotenv/Vercel UI에서 값 전체가 따옴표로 감싸진 경우 한 겹만 제거 */
function stripOptionalOuterQuotes(s: string): string {
  if (s.length < 2) return s;
  const a = s[0];
  const b = s[s.length - 1];
  if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
    return stripEnvNoise(s.slice(1, -1));
  }
  return s;
}

function normalizeCronSecret(): string | null {
  const raw =
    process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!raw) return null;
  const cleaned = stripOptionalOuterQuotes(stripEnvNoise(raw));
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeBearerToken(authHeader: string | null): string | null {
  const raw = stripEnvNoise(authHeader ?? '');
  if (!raw) return null;
  const m = /^Bearer\s+([\s\S]+)$/i.exec(raw);
  if (!m?.[1]) return null;
  return stripOptionalOuterQuotes(stripEnvNoise(m[1]));
}

export function isCronAuthorized(authHeader: string | null): boolean {
  const secret = normalizeCronSecret();
  if (!secret) return true;

  const token = normalizeBearerToken(authHeader);
  if (!token) return false;

  return token === secret;
}
