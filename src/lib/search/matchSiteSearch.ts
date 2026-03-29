import type { Locale } from '@/i18n/types';
import { hangulChosungSequence, isChosungOnlyQuery } from '@/lib/search/hangulChosung';
import type { SiteSearchEntryDef } from '@/lib/search/siteSearchEntries';

export type SiteSearchHit = SiteSearchEntryDef & {
  score: number;
};

function scoreFor(
  entry: SiteSearchEntryDef,
  qRaw: string,
  locale: Locale,
): number {
  const q = qRaw.trim();
  if (!q) return 0;

  const koPack = `${entry.koTitle} ${entry.koBlob}`.toLowerCase();
  const thPack = `${entry.thTitle} ${entry.thBlob}`.toLowerCase();
  const hrefLow = entry.href.toLowerCase();
  const qLow = q.toLowerCase();

  if (isChosungOnlyQuery(q)) {
    const qCh = q.replace(/\s/g, '');
    const koCh = hangulChosungSequence(`${entry.koTitle}${entry.koBlob}`);
    if (koCh.includes(qCh)) return 120;
    return 0;
  }

  let best = 0;

  if (hrefLow === qLow || hrefLow.endsWith(qLow) || qLow.includes(hrefLow)) best = Math.max(best, 95);
  if (koPack.startsWith(qLow)) best = Math.max(best, 90);
  if (thPack.startsWith(qLow)) best = Math.max(best, 88);
  if (koPack.includes(qLow)) best = Math.max(best, 70);
  if (thPack.includes(qLow)) best = Math.max(best, 68);

  const chQ = hangulChosungSequence(q);
  if (chQ.length >= 2) {
    const koCh = hangulChosungSequence(`${entry.koTitle}${entry.koBlob}`);
    if (koCh.includes(chQ)) best = Math.max(best, 75);
  }

  if (locale === 'ko' && entry.koTitle.toLowerCase().includes(qLow)) best = Math.max(best, 82);
  if (locale === 'th' && entry.thTitle.toLowerCase().includes(qLow)) best = Math.max(best, 80);

  return best;
}

export function matchSiteSearch(
  entries: SiteSearchEntryDef[],
  query: string,
  locale: Locale,
  limit = 8,
): SiteSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const hits: SiteSearchHit[] = [];
  for (const e of entries) {
    const score = scoreFor(e, q, locale);
    if (score > 0) hits.push({ ...e, score });
  }

  hits.sort((a, b) => b.score - a.score || a.koTitle.localeCompare(b.koTitle, 'ko'));
  return hits.slice(0, limit);
}
