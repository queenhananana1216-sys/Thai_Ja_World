import 'server-only';

/** 홈 공개 피드 — DB 접근은 `home-queries.ts` 의 anon 전용 클라이언트만 사용(쿠키·SSR 없음). */

import {
  fetchHomeJobs,
  fetchHomeMarket,
  fetchHomePostsByCategory,
  fetchHomeLocalPublicView,
  fetchHomeLocalBusinesses,
  fetchHomeNewsDigest,
  fetchHomeLeftRailBanners,
  fetchHomeUnifiedFeed,
  fetchHomeSiteTotals,
} from '../../_components/home/home-queries';
import type { HomeUnifiedFeedItem } from '../../_components/home/home-feed-types';
import { categoryLabel } from '@/lib/community/postCategories';

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
  qna: PortalFeedLine[];
  localBiz: PortalFeedLine[];
  news: PortalFeedLine[];
  wingBanners: PortalFeedLine[];
  /** 통합 피드(RPC 또는 posts 폴백) — 하단 실시간 스트립 */
  liveFeed: PortalFeedLine[];
  siteTotals: { profileCount: number; communityItemCount: number } | null;
};

/** DB·네트워크 실패·타임아웃 시 — 빈 배열만(플레이스홀더 글·샘플 제목 없음) */
export const HONEST_EMPTY_PORTAL_HOME_FEED: PortalHomeFeed = {
  jobs: [],
  market: [],
  freeBoard: [],
  qna: [],
  localBiz: [],
  news: [],
  wingBanners: [],
  liveFeed: [],
  siteTotals: null,
};

const HOME_FETCH_TIMEOUT_MS = 8000;

function unifiedItemToLine(item: HomeUnifiedFeedItem): PortalFeedLine | null {
  const id = String(item.id ?? '').trim();
  const title = String(item.title ?? '').trim();
  if (!id || !title) return null;
  const href = `/community/boards/${encodeURIComponent(id)}`;
  const pill =
    item.kind === 'job'
      ? '구인'
      : item.kind === 'market'
        ? '거래'
        : categoryLabel(item.category || 'free', 'ko');
  const excerpt = item.excerpt?.trim();
  const subtitle = excerpt
    ? `${pill} · ${excerpt.slice(0, 96)}${excerpt.length > 96 ? '…' : ''}`
    : `${pill} · 댓글 ${item.comment_count} · 조회 ${item.view_count}`;
  return {
    id: `${item.kind}-${id}`,
    title,
    href,
    subtitle,
  };
}

async function withTimeout<T>(task: Promise<T>, fallback: T, timeoutMs = HOME_FETCH_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

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

/** Supabase에서 온 행만 노출. 제목·id 없으면 행 자체를 버림(가짜 플레이스홀더 없음). */
function compactLines(lines: (PortalFeedLine | null)[]): PortalFeedLine[] {
  return lines.filter((x): x is PortalFeedLine => x != null && Boolean(x.id?.trim()) && Boolean(x.title?.trim()));
}

/**
 * 루트 포털 3열 — Supabase 실데이터만 (`home-queries` → `createPublicAnonClient()`: jobs, market, posts, processed_news, premium_banners, RPC).
 * 타임아웃·에러·빈 결과는 빈 배열; 샘플 글이나 임의 기사 제목을 넣지 않음.
 */
export async function fetchPortalHomeFeed(): Promise<PortalHomeFeed> {
  const out: PortalHomeFeed = {
    jobs: [],
    market: [],
    freeBoard: [],
    qna: [],
    localBiz: [],
    news: [],
    wingBanners: [],
    liveFeed: [],
    siteTotals: null,
  };

  try {
    const j = await withTimeout(fetchHomeJobs(8), { rows: [], error: null });
    out.jobs = compactLines(
      (j.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: '/community/boards?cat=job',
          subtitle: jobSubtitle(r),
        };
      }),
    );
  } catch {
    out.jobs = [];
  }

  try {
    const m = await withTimeout(fetchHomeMarket(8), { rows: [], error: null });
    out.market = compactLines(
      (m.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: '/community/boards?cat=flea',
          subtitle: marketSubtitle(r),
        };
      }),
    );
  } catch {
    out.market = [];
  }

  try {
    const f = await withTimeout(fetchHomePostsByCategory('free', 8), { rows: [], error: null });
    out.freeBoard = compactLines(
      (f.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: `/community/boards/${encodeURIComponent(id)}`,
          subtitle: r.comment_count != null ? `댓글 ${r.comment_count}` : null,
        };
      }),
    );
  } catch {
    out.freeBoard = [];
  }

  try {
    const q = await withTimeout(fetchHomePostsByCategory('qna', 8), { rows: [], error: null });
    out.qna = compactLines(
      (q.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: `/community/boards/${encodeURIComponent(id)}`,
          subtitle: r.comment_count != null ? `댓글 ${r.comment_count}` : null,
        };
      }),
    );
  } catch {
    out.qna = [];
  }

  try {
    const pub = await withTimeout(fetchHomeLocalPublicView(8), { rows: [], error: null });
    let rows = pub.rows ?? [];
    if (rows.length === 0) {
      const rpc = await withTimeout(fetchHomeLocalBusinesses(8), { rows: [], error: null });
      rows = rpc.rows ?? [];
    }
    out.localBiz = compactLines(
      rows.map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.name ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: r.slug ? `/shop/${encodeURIComponent(r.slug)}` : '/local',
          subtitle: [r.region, r.category].filter(Boolean).join(' · ') || r.description?.slice(0, 72) || null,
        };
      }),
    );
  } catch {
    out.localBiz = [];
  }

  try {
    const n = await withTimeout(fetchHomeNewsDigest(8), { rows: [], error: null });
    out.news = compactLines(
      (n.rows ?? []).map((r) => {
        const id = String(r.id ?? '').trim();
        const title = String(r.title ?? '').trim();
        if (!id || !title) return null;
        return {
          id,
          title,
          href: `/news/${encodeURIComponent(id)}`,
          subtitle: r.summary?.trim() ? r.summary.trim().slice(0, 100) : null,
        };
      }),
    );
  } catch {
    out.news = [];
  }

  try {
    const b = await withTimeout(fetchHomeLeftRailBanners(), { rows: [], error: null });
    out.wingBanners = compactLines(
      (b.rows ?? []).map((row) => {
        const id = String(row.id ?? '').trim();
        const title = String(row.title ?? '').trim();
        if (!id || !title) return null;
        const href = row.href?.trim() ? String(row.href) : '/ads';
        return {
          id,
          title,
          href,
          subtitle: row.subtitle?.trim() ?? null,
        };
      }),
    );
  } catch {
    out.wingBanners = [];
  }

  try {
    const u = await withTimeout(fetchHomeUnifiedFeed(14), { rows: [], error: null });
    out.liveFeed = compactLines((u.rows ?? []).map((row) => unifiedItemToLine(row)));
  } catch {
    out.liveFeed = [];
  }

  try {
    const s = await withTimeout(fetchHomeSiteTotals(), { profileCount: 0, communityItemCount: 0, error: null });
    if (!s.error) {
      out.siteTotals = {
        profileCount: Number(s.profileCount ?? 0),
        communityItemCount: Number(s.communityItemCount ?? 0),
      };
    }
  } catch {
    out.siteTotals = null;
  }

  return out;
}
