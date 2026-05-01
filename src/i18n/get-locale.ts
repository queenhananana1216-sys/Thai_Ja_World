import { headers } from 'next/headers';
import { type Locale, isLocale } from './types';

/**
 * 요청 헤더 `x-tj-locale`이 있으면 사용. (미들웨어 프리패스 시 미설정 → 기본 `ko`)
 * 클라이언트 로케일은 `/api/locale`·쿠키·`?lang=` 링크 등과 별개로, 서버 RSC는 여기만 본다.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const raw = h.get('x-tj-locale');
  if (raw && isLocale(raw)) return raw;
  return 'ko';
}
