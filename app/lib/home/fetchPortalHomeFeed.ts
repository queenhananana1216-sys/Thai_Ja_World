import 'server-only';

import {
  fetchHomeJobs,
  fetchHomeMarket,
  fetchHomePostsByCategory,
  fetchHomeLocalPublicView,
  fetchHomeLocalBusinesses,
  fetchHomeNewsDigest,
  fetchHomeLeftRailBanners,
} from '../../_components/home/home-queries';

export type PortalFeedLine = {
  id: string;
  title: string;
  href: string;
  subtitle: string | null;
};

export type PortalHomeFeed = {
  jobs: PortalFeedLine[];
  market: PortalFeedLine[];
  freeBoard: PortalFeedLine[];
  localBiz: PortalFeedLine[];
  news: PortalFeedLine[];
  wingBanners: PortalFeedLine[];
};

const emptyFeed = (): PortalHomeFeed => ({
  jobs: [],
  market: [],
  freeBoard: [],
  localBiz: [],
  news: [],
  wingBanners: [],
});

function jobSubtitle(
  row: {
    company_name?: string | null;
    location?: string | null;
    salary?: string | null;
    excerpt?: string | null;
  },
): string | null {
  const parts = [row.company_name, row.location, row.salary].filter(Boolean) as string[];
  if (parts.length) return parts.join(' · ');
  return row.excerpt?.trim() ? row.excerpt.trim().slice(0, 80) : null;
}

function marketSubtitle(
  row: { price_display?: string | null; location?: string | null; excerpt?: string | null; status?: string },
): string | null {
  const parts = [row.price_display, row.location, row.status].filter(Boolean) as string[];
  if (parts.length) return parts.join(' · ');
  return row.excerpt?.trim() ? row.excerpt.trim().slice(0, 80) : null;
}

/** 루트 포털 3열 — Supabase 실데이터만 (실패·빈 배열은 안전 폴백) */
export async function fetchPortalHomeFeed(): Promise<PortalHomeFeed> {
  const out = emptyFeed();

  try {
    const j = await fetchHomeJobs(8);
    out.jobs = (j.rows ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? '').trim() || '(제목 없음)',
      href: `/community/boards?cat=job`,
      subtitle: jobSubtitle(r),
    }));
  } catch {
    /* keep [] */
  }

  try {
    const m = await fetchHomeMarket(8);
    out.market = (m.rows ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? '').trim() || '(제목 없음)',
      href: `/community/boards?cat=flea`,
      subtitle: marketSubtitle(r),
    }));
  } catch {
    /* keep [] */
  }

  try {
    const f = await fetchHomePostsByCategory('free', 8);
    out.freeBoard = (f.rows ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? '').trim() || '(제목 없음)',
      href: `/community/boards/${encodeURIComponent(r.id)}`,
      subtitle: r.comment_count != null ? `댓글 ${r.comment_count}` : null,
    }));
  } catch {
    /* keep [] */
  }

  try {
    const pub = await fetchHomeLocalPublicView(8);
    let rows = pub.rows ?? [];
    if (rows.length === 0) {
      const rpc = await fetchHomeLocalBusinesses(8);
      rows = rpc.rows ?? [];
    }
    out.localBiz = rows.map((r) => ({
      id: String(r.id),
      title: String(r.name ?? '').trim() || '(이름 없음)',
      href: r.slug ? `/shop/${encodeURIComponent(r.slug)}` : '/local',
      subtitle: [r.region, r.category].filter(Boolean).join(' · ') || r.description?.slice(0, 72) || null,
    }));
  } catch {
    /* keep [] */
  }

  try {
    const n = await fetchHomeNewsDigest(8);
    out.news = (n.rows ?? []).map((r) => ({
      id: String(r.id),
      title: String(r.title ?? '').trim() || '(제목 없음)',
      href: r.href?.trim() ? r.href : `/news/${encodeURIComponent(r.id)}`,
      subtitle: r.summary?.trim() ? r.summary.trim().slice(0, 100) : null,
    }));
  } catch {
    /* keep [] */
  }

  try {
    const b = await fetchHomeLeftRailBanners();
    out.wingBanners = (b.rows ?? []).map((row) => ({
      id: String(row.id),
      title: String(row.title ?? '').trim() || '배너',
      href: row.href?.trim() ? String(row.href) : '/ads',
      subtitle: row.subtitle?.trim() ?? null,
    }));
  } catch {
    /* keep [] */
  }

  return out;
}
