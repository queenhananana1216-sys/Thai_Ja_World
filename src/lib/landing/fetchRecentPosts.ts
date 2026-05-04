import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/types';
import { postAiFeedSignalsFromInsight } from '@/lib/community/postAiInsightDisplay';

/**
 * 홈 "최신 게시글" 피드용 — 안전(모더레이션 통과) 게시글을 카테고리 무관하게
 * 최신 순으로 N 개. 실패 / env 누락 시 빈 배열.
 *
 * 테이블: public.posts
 */

export type RecentPostItem = {
  id: string;
  title: string;
  excerpt: string | null;
  category: 'free' | 'restaurant' | 'info' | 'flea' | 'job' | string;
  isKnowledgeTip: boolean;
  createdAt: string | null;
  commentCount: number;
  viewCount: number;
  /** 목록 뱃지용 — ai_insight.display 요약 */
  insightBadge: 'none' | 'insight' | 'urgent';
};

export async function fetchRecentPosts(limit = 12, locale: Locale = 'ko'): Promise<RecentPostItem[]> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('posts')
      .select(
        'id, title, excerpt, category, is_knowledge_tip, created_at, comment_count, view_count, author_hidden, ai_insight',
      )
      .eq('moderation_status', 'safe')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // author_hidden 필터링 여유

    if (error) return [];
    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      excerpt: string | null;
      category: string;
      is_knowledge_tip: boolean | null;
      created_at: string | null;
      comment_count: number | null;
      view_count: number | null;
      author_hidden: boolean | null;
      ai_insight: unknown;
    }>;

    return rows
      .filter((r) => !r.author_hidden)
      .slice(0, limit)
      .map((r) => {
        const sig = postAiFeedSignalsFromInsight(r.ai_insight, locale);
        let insightBadge: RecentPostItem['insightBadge'] = 'none';
        if (sig.hasInsightBlock) {
          insightBadge = sig.incidentAttention !== 'none' ? 'urgent' : 'insight';
        }
        return {
          id: String(r.id),
          title: (r.title ?? '').trim() || '(제목 없음)',
          excerpt: r.excerpt?.trim() ?? null,
          category: r.category,
          isKnowledgeTip: Boolean(r.is_knowledge_tip),
          createdAt: r.created_at,
          commentCount: typeof r.comment_count === 'number' ? r.comment_count : 0,
          viewCount: typeof r.view_count === 'number' ? r.view_count : 0,
          insightBadge,
        };
      });
  } catch {
    return [];
  }
}
