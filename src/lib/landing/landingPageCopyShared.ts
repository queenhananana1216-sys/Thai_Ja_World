import type { Locale } from '@/i18n/types';

export type Bilingual = { ko: string; th: string };

export function pickBilingual(s: Bilingual, locale: Locale): string {
  return locale === 'th' ? s.th : s.ko;
}
