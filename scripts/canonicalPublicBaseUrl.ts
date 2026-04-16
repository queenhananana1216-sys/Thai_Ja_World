/**
 * 프로덕션 스모크/검증 시 apex 도메인을 www 로 통일 (동일 콘텐츠 기준).
 */
export function canonicalPublicBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return 'https://www.thaijaworld.com';
  if (/^https?:\/\/thaijaworld\.com$/i.test(trimmed)) {
    return trimmed.replace(/thaijaworld\.com/i, 'www.thaijaworld.com');
  }
  return trimmed;
}
