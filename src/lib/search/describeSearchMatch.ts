import type { Locale } from '@/i18n/types';
import type { SiteSearchHit } from '@/lib/search/matchSiteSearch';

/** 검색 결과에 표시할 «어디가 맞았는지» 한 줄 */
export function describeSearchMatch(hit: SiteSearchHit, qRaw: string, locale: Locale): string {
  const q = qRaw.trim();
  if (!q) return '';
  const qLow = q.toLowerCase();
  const title = locale === 'th' ? hit.thTitle : hit.koTitle;
  if (title.toLowerCase().includes(qLow)) {
    return locale === 'th' ? `ชื่อเมนูมี «${q}»` : `메뉴 제목에 «${q}»`;
  }
  const hrefLow = hit.href.toLowerCase();
  const qPath = qLow.replace(/^\//, '');
  if (hrefLow.includes(qLow) || (qPath && hrefLow.includes(qPath))) {
    return locale === 'th' ? `พาธ ${hit.href}` : `경로 ${hit.href}`;
  }
  const blob = locale === 'th' ? hit.thBlob : hit.koBlob;
  if (blob.toLowerCase().includes(qLow)) {
    return locale === 'th' ? 'คีย์เวิร์ดในคำอธิบาย' : '안내·동의어 키워드에 일치';
  }
  return locale === 'th' ? 'รายการที่ตรงกัน' : '목록과 일치';
}
