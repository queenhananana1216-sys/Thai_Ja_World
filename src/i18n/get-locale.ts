import { headers } from 'next/headers';
import { type Locale, isLocale } from './types';

/**
 * 미들웨어가 요청 헤더에 넣은 `x-tj-locale`만 사용 (cookies() 미사용).
 * `/api/locale` 로 쿠키가 바뀌면 다음 네비게이션에서 미들웨어가 다시 주입.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const raw = h.get('x-tj-locale');
  if (raw && isLocale(raw)) return raw;
  return 'ko';
}
