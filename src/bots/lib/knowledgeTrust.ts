/**
 * 지식 수집 URL 신뢰도 필터 (허용 접미 도메인 + 차단 목록).
 *
 * KNOWLEDGE_TRUST_MODE:
 *   strict (기본) — 신뢰 접미 도메인에 해당하는 호스트만 통과
 *   loose        — 차단 목록만 제외 (기존 동작에 가깝게)
 */

export type KnowledgeTrustMode = 'strict' | 'loose';

const DEFAULT_TRUSTED_SUFFIXES = [
  'bangkokpost.com',
  'nationthailand.com',
  'nationmultimedia.com',
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'scmp.com',
  'channelnewsasia.com',
  'thaipbs.or.th',
  'thaipbsworld.com',
  'go.th',
  'immigration.go.th',
  'mfa.go.th',
  'moi.go.th',
  '0404.go.kr',
  'mofa.go.kr',
  'korea.net',
  'yna.co.kr',
  'ytn.co.kr',
  'kbs.co.kr',
  'hikorea.go.kr',
  'thaiembassy.org',
  'overseas.go.kr',
];

const DEFAULT_BLOCKED_SUFFIXES = [
  'pinterest.com',
  'pin.it',
  'facebook.com',
  'fb.com',
  'instagram.com',
  'tiktok.com',
  'tumblr.com',
  'reddit.com',
  'linkedin.com',
  'telegram.me',
  't.me',
];

function parseCommaList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return [...fallback];
  const parsed = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length ? parsed : [...fallback];
}

export function knowledgeTrustMode(): KnowledgeTrustMode {
  const v = process.env.KNOWLEDGE_TRUST_MODE?.trim().toLowerCase();
  if (v === 'loose') return 'loose';
  return 'strict';
}

export function trustedHostSuffixes(): string[] {
  return parseCommaList(process.env.KNOWLEDGE_TRUSTED_HOST_SUFFIXES, DEFAULT_TRUSTED_SUFFIXES);
}

export function blockedHostSuffixes(): string[] {
  return parseCommaList(process.env.KNOWLEDGE_BLOCKED_HOST_SUFFIXES, DEFAULT_BLOCKED_SUFFIXES);
}

export function urlHostname(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesSuffix(host: string, suffix: string): boolean {
  const h = host.toLowerCase();
  const s = suffix.toLowerCase();
  return h === s || h.endsWith(`.${s}`);
}

export function isBlockedHost(host: string): boolean {
  return blockedHostSuffixes().some((s) => hostMatchesSuffix(host, s));
}

export function isTrustedHost(host: string): boolean {
  return trustedHostSuffixes().some((s) => hostMatchesSuffix(host, s));
}

/** http(s) 이고 차단되지 않았으며, strict 이면 신뢰 접미 도메인만 허용 */
export function isKnowledgeUrlAccepted(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  } catch {
    return false;
  }
  const host = urlHostname(url);
  if (!host) return false;
  if (isBlockedHost(host)) return false;
  if (knowledgeTrustMode() === 'loose') return true;
  return isTrustedHost(host);
}

export function trustedUrlRank(url: string): number {
  const h = urlHostname(url);
  if (!h) return 2;
  if (isBlockedHost(h)) return 3;
  return isTrustedHost(h) ? 0 : 1;
}
