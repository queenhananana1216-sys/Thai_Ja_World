import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import type { Locale } from '@/i18n/types';

/**
 * 홈 랜딩 "광장 심박수(Community Pulse)" 섹션용 데이터 집계.
 *
 * 실제 파이프라인과 연결:
 *  - 뉴스:         processed_news(published=true) + raw_news + summaries (크론: /api/cron/news)
 *  - 정보(꿀팁):   posts(is_knowledge_tip=true, category='info')    (크론: /api/cron/knowledge)
 *  - 자유토론:     posts(category='free')
 *  - 질문답변:     posts(category='info', is_knowledge_tip=false)   ← 이용자 작성 질문
 *  - 맛집/동네:    posts(category='restaurant')
 *
 * 실패 / env 누락 / 테이블 없음 → 전부 빈 리스트 + degraded=true.
 * 레이아웃을 깨뜨리지 않기 위해 예외를 절대 던지지 않음.
 */

export type PulseItem = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  createdAt: string | null;
  /** 선택적 숫자 레이블 (댓글 수·조회 수). 없으면 null */
  commentCount: number | null;
  viewCount: number | null;
};

export type PulseColumn = {
  /** 화면에 표시할 short label */
  label: string;
  /** 색상 테마 (하드코딩 회피용 slug) */
  accent: 'lavender' | 'pink' | 'amber' | 'sky' | 'lime';
  /** 전체 목록으로 이동할 링크 */
  moreHref: string;
  items: PulseItem[];
  /** 오늘 생성된 항목 수 (메타에 노출) */
  todayCount: number;
};

export type CommunityPulse = {
  columns: PulseColumn[];
  degraded: boolean;
  /** UI 캡션용 */
  generatedAt: string;
};

function startOfTodayKstIso(): string {
  const now = new Date();
  // KST 기준 00:00 — 태국 사는 한국인 기준점은 아니지만, 지금은 KST 로 통일.
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000).toISOString();
}

function toSnippet(s: string | null | undefined, n = 90): string | null {
  const t = (s ?? '').trim();
  if (!t) return null;
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

const LIMIT_PER_COLUMN = 7;

async function fetchNewsColumn(locale: Locale): Promise<{
  column: PulseColumn;
  degraded: boolean;
}> {
  const label = locale === 'th' ? 'ข่าวสาร' : '뉴스';
  const column: PulseColumn = {
    label,
    accent: 'sky',
    moreHref: '/news',
    items: [],
    todayCount: 0,
  };

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('processed_news')
      .select(
        'id, clean_body, created_at, raw_news(title, external_url, published_at), summaries(summary_text, model)',
      )
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_COLUMN);

    if (error) {
      return { column, degraded: true };
    }

    const { count: todayCount } = await sb
      .from('processed_news')
      .select('id', { count: 'exact', head: true })
      .eq('published', true)
      .gte('created_at', startOfTodayKstIso());

    const items: PulseItem[] = [];
    for (const pn of data ?? []) {
      const rn = pn.raw_news as unknown as {
        title: string;
        external_url: string;
        published_at: string | null;
      } | null;
      const sums = pn.summaries as unknown as
        | { summary_text: string; model: string | null }[]
        | null;
      const { title, summary_text } = titleAndSummaryFromProcessed(
        (pn.clean_body as string | null) ?? null,
        rn?.title ?? null,
        sums ?? null,
        locale,
      );
      if (!title?.trim()) continue;
      items.push({
        id: String(pn.id),
        title: title.trim(),
        subtitle: toSnippet(summary_text),
        href: `/news/${pn.id}`,
        createdAt: rn?.published_at ?? (pn.created_at as string | null),
        commentCount: null,
        viewCount: null,
      });
    }
    column.items = items;
    column.todayCount = todayCount ?? 0;
    return { column, degraded: false };
  } catch {
    return { column, degraded: true };
  }
}

type PostsQuery = {
  label: string;
  accent: PulseColumn['accent'];
  moreHref: string;
  category: 'free' | 'restaurant' | 'info' | 'flea' | 'job' | 'report_find' | 'report_missing';
  isKnowledgeTip: boolean | 'any';
  /** 'info'+is_knowledge_tip=true 인 꿀팁은 /tips/[id] 로 보내야 한다 */
  itemHrefBase: '/community/boards/' | '/tips/';
};

async function fetchPostsColumn(
  locale: Locale,
  q: PostsQuery,
): Promise<{ column: PulseColumn; degraded: boolean }> {
  const _locale = locale;
  const column: PulseColumn = {
    label: q.label,
    accent: q.accent,
    moreHref: q.moreHref,
    items: [],
    todayCount: 0,
  };
  try {
    const sb = createServerClient();
    let query = sb
      .from('posts')
      .select('id, title, excerpt, created_at, comment_count, view_count, category, is_knowledge_tip')
      .eq('moderation_status', 'safe')
      .eq('category', q.category)
      .order('created_at', { ascending: false })
      .limit(LIMIT_PER_COLUMN);

    if (q.isKnowledgeTip !== 'any') {
      query = query.eq('is_knowledge_tip', q.isKnowledgeTip);
    }

    const { data, error } = await query;
    if (error) return { column, degraded: true };

    let countQuery = sb
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('moderation_status', 'safe')
      .eq('category', q.category)
      .gte('created_at', startOfTodayKstIso());
    if (q.isKnowledgeTip !== 'any') {
      countQuery = countQuery.eq('is_knowledge_tip', q.isKnowledgeTip);
    }
    const { count: todayCount } = await countQuery;

    column.todayCount = todayCount ?? 0;
    column.items = (data ?? []).map((row) => {
      const id = String(row.id);
      return {
        id,
        title: ((row.title as string) ?? '').trim() || '(제목 없음)',
        subtitle: toSnippet((row.excerpt as string | null) ?? null),
        href: `${q.itemHrefBase}${id}`,
        createdAt: (row.created_at as string | null) ?? null,
        commentCount:
          typeof row.comment_count === 'number' ? (row.comment_count as number) : null,
        viewCount: typeof row.view_count === 'number' ? (row.view_count as number) : null,
      };
    });
    return { column, degraded: false };
  } catch {
    return { column, degraded: true };
  }
}

export async function fetchCommunityPulse(locale: Locale): Promise<CommunityPulse> {
  const settled = await Promise.allSettled([
    fetchNewsColumn(locale),
    fetchPostsColumn(locale, {
      label: locale === 'th' ? 'เคล็ดลับ' : '정보·꿀팁',
      accent: 'lavender',
      moreHref: '/tips',
      category: 'info',
      isKnowledgeTip: true,
      itemHrefBase: '/tips/',
    }),
    fetchPostsColumn(locale, {
      label: locale === 'th' ? 'พูดคุย' : '자유토론',
      accent: 'pink',
      moreHref: '/community/boards?cat=free',
      category: 'free',
      isKnowledgeTip: 'any',
      itemHrefBase: '/community/boards/',
    }),
    fetchPostsColumn(locale, {
      label: locale === 'th' ? 'ถามตอบ' : '질문답변',
      accent: 'amber',
      moreHref: '/community/boards?cat=info',
      category: 'info',
      isKnowledgeTip: false,
      itemHrefBase: '/community/boards/',
    }),
    fetchPostsColumn(locale, {
      label: locale === 'th' ? 'ร้านแนะนำ' : '동네·맛집',
      accent: 'lime',
      moreHref: '/community/boards?cat=restaurant',
      category: 'restaurant',
      isKnowledgeTip: 'any',
      itemHrefBase: '/community/boards/',
    }),
  ]);

  const columns: PulseColumn[] = [];
  let degraded = false;
  for (const s of settled) {
    if (s.status === 'fulfilled') {
      columns.push(s.value.column);
      if (s.value.degraded) degraded = true;
    } else {
      degraded = true;
    }
  }

  return {
    columns,
    degraded,
    generatedAt: new Date().toISOString(),
  };
}
