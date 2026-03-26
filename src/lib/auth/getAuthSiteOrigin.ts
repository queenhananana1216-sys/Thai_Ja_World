/**
 * Auth 이메일/OTP/OAuth 리다이렉트 URL 생성용.
 *
 * 기존 구현은 `window.location.origin`을 사용해서,
 * 로컬(또는 특정 프록시)에서 요청이 한 번이라도 나가면 이메일 링크가 localhost로 고정될 수 있음.
 *
 * 그래서 `NEXT_PUBLIC_SITE_URL`이 있으면 그 값을 우선으로 쓰고,
 * 없으면 fallback으로 현재 origin을 사용합니다.
 */
export function getAuthSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

