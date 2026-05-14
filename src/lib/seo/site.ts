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

function normalizeSeoOverlapText(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function seoOverlapTokens(s: string): Set<string> {
  const out = new Set<string>();
  for (const part of normalizeSeoOverlapText(s).split(/[\s,]+/)) {
    const t = part.trim();
    if (t.length >= 2) out.add(t);
  }
  return out;
}

export function seoTokenSetJaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

export function avgKeywordBodySupport(keywords: string[], body: string): number {
  const bodyN = normalizeSeoOverlapText(body);
  const bodyTok = seoOverlapTokens(body);
  if (!keywords.length) return 1;
  let sum = 0;
  for (const raw of keywords) {
    const k = raw.trim();
    if (!k) continue;
    const kt = seoOverlapTokens(k);
    if (kt.size === 0) {
      sum += bodyN.includes(normalizeSeoOverlapText(k)) ? 1 : 0;
      continue;
    }
    let hit = 0;
    for (const t of kt) {
      if (bodyTok.has(t) || (t.length >= 3 && bodyN.includes(t))) hit += 1;
    }
    sum += hit / Math.max(1, kt.size);
  }
  return sum / keywords.length;
}

export function filterSeoKeywordsAgainstBody(
  keywords: string[],
  body: string,
  minSupport = 0.28,
): string[] {
  const bodyN = normalizeSeoOverlapText(body);
  const bodyTok = seoOverlapTokens(body);
  return keywords
    .map((k) => k.trim())
    .filter(Boolean)
    .filter(
      (k) =>
        avgKeywordBodySupport([k], bodyN.length ? bodyN : body) >= minSupport ||
        bodyTok.has(normalizeSeoOverlapText(k)),
    );
}

export function headlineRawOverlap(headline: string, rawBody: string | null | undefined): number {
  const h = headline.trim();
  const b = String(rawBody ?? '').slice(0, 12000);
  if (!h || !b.trim()) return 0;
  return seoTokenSetJaccard(seoOverlapTokens(h), seoOverlapTokens(b));
}

export function bilingualKoHeadlineAgreement(
  a: { title_kr: string; ko_blurb: string },
  b: { title_kr: string; ko_blurb: string },
): number {
  const ta = seoOverlapTokens(`${a.title_kr}\n${a.ko_blurb}`);
  const tb = seoOverlapTokens(`${b.title_kr}\n${b.ko_blurb}`);
  return seoTokenSetJaccard(ta, tb);
}
