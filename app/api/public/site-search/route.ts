/**
 * GET /api/public/site-search?q=&locale=ko|th
 * 고정 메뉴 + 공개 뉴스 제목 검색(비회원 검색창용). 본문 열람 정책은 페이지·미들웨어와 별개.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { describeSearchMatch } from '@/lib/search/describeSearchMatch';
import { matchSiteSearch } from '@/lib/search/matchSiteSearch';
import { SITE_SEARCH_ENTRIES } from '@/lib/search/siteSearchEntries';
import { sitePathRequiresMemberContent } from '@/lib/search/sitePathAccess';
import type { Locale } from '@/i18n/types';

export const runtime = 'nodejs';

function sanitizeQ(raw: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .slice(0, 48)
    .replace(/%/g, '')
    .replace(/\0/g, '');
}

export type SiteSearchApiPageHit = {
  kind: 'page';
  href: string;
  title: string;
  pathLabel: string;
  matchDetail: string;
  requiresLogin: boolean;
  score: number;
};

export type SiteSearchApiNewsHit = {
  kind: 'news';
  href: string;
  title: string;
  pathLabel: string;
  matchDetail: string;
  requiresLogin: true;
  score: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = sanitizeQ(searchParams.get('q'));
  const locRaw = searchParams.get('locale')?.toLowerCase();
  const locale: Locale = locRaw === 'th' ? 'th' : 'ko';

  if (q.length < 2) {
    return NextResponse.json({ pages: [] as SiteSearchApiPageHit[], news: [] as SiteSearchApiNewsHit[] });
  }

  const scored = matchSiteSearch(SITE_SEARCH_ENTRIES, q, locale, 14);
  const pages: SiteSearchApiPageHit[] = scored.map((h) => ({
    kind: 'page',
    href: h.href,
    title: locale === 'th' ? h.thTitle : h.koTitle,
    pathLabel: h.href,
    matchDetail: describeSearchMatch(h, q, locale),
    requiresLogin: sitePathRequiresMemberContent(h.href),
    score: h.score,
  }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const news: SiteSearchApiNewsHit[] = [];

  if (url?.trim() && key?.trim()) {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb
      .from('processed_news')
      .select('id, clean_body, raw_news(title)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(72);

    const qLow = q.toLowerCase();
    for (const row of data ?? []) {
      const rn = row.raw_news as { title?: string } | null;
      const rawTitle = rn?.title ?? '';
      const { title } = titleAndSummaryFromProcessed(
        row.clean_body as string | null,
        rawTitle || null,
        null,
        locale,
      );
      const hay = `${rawTitle} ${title}`.toLowerCase();
      if (!hay.includes(qLow)) continue;
      news.push({
        kind: 'news',
        href: `/news/${row.id}`,
        title,
        pathLabel: `/news/${String(row.id).slice(0, 8)}…`,
        matchDetail:
          locale === 'th'
            ? `หัวข้อข่าว / สรุปมี «${q}»`
            : `기사 제목·정리 문구에 «${q}»`,
        requiresLogin: true,
        score: 45,
      });
      if (news.length >= 8) break;
    }
  }

  return NextResponse.json({ pages, news });
}
