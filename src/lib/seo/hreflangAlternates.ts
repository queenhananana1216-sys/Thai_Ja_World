import type { Metadata } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

export function hreflangLanguagesForCanonicalPath(
  path: string,
): NonNullable<Metadata['alternates']>['languages'] {
  const base = absoluteUrl(path);
  const sep = base.includes('?') ? '&' : '?';
  const withLang = (code: string) => `${base}${sep}lang=${code}`;
  return {
    ko: withLang('ko'),
    th: withLang('th'),
    en: withLang('en'),
    'zh-CN': withLang('zh'),
  };
}

export function buildHreflangAlternates(path: string): Metadata['alternates'] {
  return {
    canonical: absoluteUrl(path),
    languages: hreflangLanguagesForCanonicalPath(path),
  };
}
