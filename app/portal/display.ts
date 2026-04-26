import type { JobPost, MarketPost } from './types';
import { portalMetaLine } from './text';

const CONDITION_KO: Record<string, string> = {
  new: '새제',
  like_new: '거의 새것',
  good: '양호',
  fair: '사용감',
  for_parts: '부품용',
};

export function jobListMeta(j: JobPost, maxLen = 88): string {
  const bits = [j.company_name, j.location, j.salary, j.visa_requirement].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  if (bits.length > 0) return bits.join(' · ').slice(0, maxLen);
  return portalMetaLine({ excerpt: j.excerpt, content: j.content }, maxLen);
}

export function marketConditionKo(code: string): string {
  return CONDITION_KO[code] ?? code;
}

export function marketListMeta(m: MarketPost, maxLen = 88): string {
  const bits = [marketConditionKo(m.item_condition), m.location].filter(
    (x): x is string => typeof x === 'string' && x.trim().length > 0,
  );
  const head = bits.join(' · ');
  if (head) return head.slice(0, maxLen);
  return portalMetaLine({ excerpt: m.excerpt, content: m.content }, maxLen);
}

export function formatMarketPrice(m: MarketPost): string {
  const d = m.price_display?.trim();
  if (d) return d;
  if (m.price_amount != null && !Number.isNaN(m.price_amount)) {
    return `${m.price_amount} ${m.price_currency}`.trim();
  }
  return '가격 문의';
}
