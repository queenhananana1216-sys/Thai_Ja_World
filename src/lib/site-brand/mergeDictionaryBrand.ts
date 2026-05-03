import type { Dictionary } from '@/i18n/dictionaries';
import { DEFAULT_SITE_DISPLAY_NAME, LEGACY_SITE_BRAND_PHRASES } from './constants';

function replaceBrandInString(s: string, siteName: string): string {
  let out = s;
  for (const ph of LEGACY_SITE_BRAND_PHRASES) {
    out = out.split(ph).join(siteName);
  }
  return out;
}

function walk(v: unknown, siteName: string): unknown {
  if (typeof v === 'string') return replaceBrandInString(v, siteName);
  if (Array.isArray(v)) return v.map((x) => walk(x, siteName));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      next[k] = walk(o[k], siteName);
    }
    return next;
  }
  return v;
}

/** `getDictionary` 결과에 레거시 브랜드 문자열을 `siteName`으로 치환 */
export function mergeDictionarySiteBrand(dict: Dictionary, siteName: string | null | undefined): Dictionary {
  const name = (siteName ?? '').trim() || DEFAULT_SITE_DISPLAY_NAME;
  return walk(dict, name) as Dictionary;
}
