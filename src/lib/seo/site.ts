/**
 * 절대 URL·사이트맵·robots·메타 canonical 공통 기준.
 * 프로덕션: NEXT_PUBLIC_SITE_URL 권장 (예: https://www.thaijaworld.com)
 * ⚠️ 반드시 www 포함 URL을 사용해야 Google 색인이 정상 작동합니다.
 */
export function getSiteBaseUrl(): string {
  const fallback = 'https://www.thaijaworld.com';
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return fallback;

  try {
    const u = new URL(raw);
    /** 운영 표준: www 고정 */
    if (u.hostname === 'thaijaworld.com') {
      u.hostname = 'www.thaijaworld.com';
    }
    /** SEO 기준 URL은 https 고정 */
    u.protocol = 'https:';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return fallback;
  }
}

export function absoluteUrl(path: string): string {
  const base = getSiteBaseUrl();
  if (!path || path === '/') return base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** 메타 description용 — 줄바꿈·다중 공백 정리 후 길이 제한 */
export function trimForMetaDescription(text: string, maxLen = 155): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}
