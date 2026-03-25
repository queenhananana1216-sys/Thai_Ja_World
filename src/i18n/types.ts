export const LOCALES = ['ko', 'th'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = 'tj_locale';

/** LanguageSwitch 등에서 쿠키 변경 후 같은 탭의 클라이언트 상태 동기화 */
export const TJ_LOCALE_CHANGE_EVENT = 'tj-locale-change';

export function isLocale(v: string): v is Locale {
  return v === 'ko' || v === 'th';
}
