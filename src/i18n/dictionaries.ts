/**
 * UI 문자열 로더 — 로케일별 청크는 `./locales/*` 에만 있고, 이 파일은 동적 import 로 한 언어만 번들에 포함시킵니다.
 */
import type { Locale } from './types';
import type { Dictionary } from './dictionary-types';

export type { Dictionary } from './dictionary-types';

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case 'th':
      return (await import('./locales/th')).dictionary;
    case 'en':
      return (await import('./locales/en')).dictionary;
    case 'zh':
      return (await import('./locales/zh')).dictionary;
    default:
      return (await import('./locales/ko')).dictionary;
  }
}

/** 클라이언트에서 언어 전환 직전에 청크만 당겨 두기 */
export function preloadDictionary(locale: Locale): void {
  switch (locale) {
    case 'th':
      void import('./locales/th');
      return;
    case 'en':
      void import('./locales/en');
      return;
    case 'zh':
      void import('./locales/zh');
      return;
    default:
      void import('./locales/ko');
  }
}
