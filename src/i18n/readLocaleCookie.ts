import { LOCALE_COOKIE, isLocale, type Locale } from './types';

/** document.cookie 에서 tj_locale 읽기 (브라우저에서만) */
export function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'ko';
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
    const raw = m?.[1] ? decodeURIComponent(m[1]) : '';
    return isLocale(raw) ? raw : 'ko';
  } catch {
    return 'ko';
  }
}
