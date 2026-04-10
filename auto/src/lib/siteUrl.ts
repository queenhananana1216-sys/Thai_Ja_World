import 'server-only';

/** auto 사이트 절대 URL (메타·canonical). 로컬 기본 3010 */
export function getAutoSiteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_AUTO_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://127.0.0.1:3010';
}
