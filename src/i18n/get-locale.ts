import { headers } from 'next/headers';
import { type Locale, isLocale } from './types';

/**
 * 미들웨어가 요청 헤더에 넣은 `x-tj-locale`만 사용.
 * 미들웨어는 `?lang=`·`tj_locale` 쿠키를 읽어 헤더를 주입한다. `/api/locale` POST도 쿠키만 갱신.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const raw = h.get('x-tj-locale');
  if (raw && isLocale(raw)) return raw;
  return 'ko';
}
