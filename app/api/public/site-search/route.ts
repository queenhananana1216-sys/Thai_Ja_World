/**
 * GET /api/public/site-search?q=&locale=ko|th
 * 고정 메뉴 + 공개 뉴스 제목 검색(비회원 검색창용). 본문 열람 정책은 페이지·미들웨어와 별개.
 */
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  listTitleSummaryFromProcessedNoRaw,
  passesKoPublicGate,
} from '@/lib/news/processedNewsDisplay';
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

/** 동일 120행을 30초간 재사용 — 쿼리별 필터는 메모리에서만 수행 */
const getSiteSearchPublishedKoNewsBulk = unstable_cache(
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url?.trim() || !key?.trim()) return [];
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await sb
      .from('processed_news')
      .select('id, clean_body, language, summaries(summary_text, model)')
      .eq('published', true)
      .eq('language', 'ko')
      .order('created_at', { ascending: false })
      .limit(120);
    return data ?? [];
  },
  ['public-site-search-ko-news-bulk-v1'],
  { revalidate: 30 },
);

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
    const bulk = await getSiteSearchPublishedKoNewsBulk();
    const qLow = q.toLowerCase();
    for (const row of bulk) {
      const sums = row.summaries as { summary_text: string; model: string | null }[] | null;
      if (
        !passesKoPublicGate(
          row.language as string | null,
          (row.clean_body as string | null) ?? null,
          sums,
        )
      ) {
        continue;
      }
      const parsed = listTitleSummaryFromProcessedNoRaw(
        row.clean_body as string | null,
        sums,
        locale,
      );
      if (!parsed?.title?.trim()) continue;
      const title = parsed.title.trim();
      const hay = `${title} ${parsed.summary_text ?? ''}`.toLowerCase();
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

  if (url?.trim() && key?.trim()) {
    const sbLog = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    void Promise.resolve(sbLog.rpc('portal_log_site_search', { p_query: q })).catch(() => {});
  }

  return NextResponse.json({ pages, news });
}
