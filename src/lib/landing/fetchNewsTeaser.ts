import 'server-only';

import { createServerClient } from '@/lib/supabase/server';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import type { Locale } from '@/i18n/types';

export type NewsTeaserItem = {
  id: string;
  title: string;
  line: string;
  createdAt: string | null;
  href: string;
};

const TEASER_LIMIT = 5;

/**
 * 홈 포털 우측 «최신 뉴스» 5줄. news 허브와 동일 `processed_news` 파이프, 실패 시 [].
 */
export async function fetchNewsTeaserForHome(locale: Locale): Promise<NewsTeaserItem[]> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('processed_news')
      .select('id, clean_body, created_at, raw_news(title, published_at), summaries(summary_text, model)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(TEASER_LIMIT);

    if (error) return [];

    return (data ?? []).map((pn) => {
      const rn = pn.raw_news as unknown as { title: string; published_at: string | null } | null;
      const sums = pn.summaries as unknown as
        | { summary_text: string; model: string | null }[]
        | null;
      const { title, summary_text } = titleAndSummaryFromProcessed(
        (pn.clean_body as string | null) ?? null,
        rn?.title ?? null,
        sums ?? null,
        locale,
      );
      const line = (summary_text || '').replace(/\s+/g, ' ').trim();
      return {
        id: String(pn.id),
        title: title || (locale === 'th' ? 'ข่าว' : '뉴스'),
        line: line.length > 120 ? `${line.slice(0, 117)}…` : line,
        createdAt: (pn as { created_at?: string | null }).created_at ?? null,
        href: `/news/${String(pn.id)}`,
      };
    });
  } catch {
    return [];
  }
}
