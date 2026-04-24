import 'server-only';

import { createServerClient } from '@/lib/supabase/server';

export type ReportBoxRow = {
  id: string;
  title: string;
  category: 'report_find' | 'report_missing';
  created_at: string;
  comment_count: number;
};

export type ReportBoxPreview = {
  find: ReportBoxRow[];
  missing: ReportBoxRow[];
  degraded: boolean;
  generatedAt: string;
};

export async function fetchReportBoxPreview(limitPerCategory = 4): Promise<ReportBoxPreview> {
  const empty: ReportBoxPreview = {
    find: [],
    missing: [],
    degraded: true,
    generatedAt: new Date().toISOString(),
  };

  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('posts')
      .select('id, title, category, created_at, comment_count')
      .eq('moderation_status', 'safe')
      .eq('is_knowledge_tip', false)
      .in('category', ['report_find', 'report_missing'])
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      return { ...empty, generatedAt: new Date().toISOString() };
    }

    const rows = (data ?? []) as {
      id: string;
      title: string;
      category: string;
      created_at: string;
      comment_count: number;
    }[];

    const find: ReportBoxRow[] = [];
    const missing: ReportBoxRow[] = [];
    for (const r of rows) {
      if (r.category === 'report_find' && find.length < limitPerCategory) {
        find.push({
          id: r.id,
          title: r.title,
          category: 'report_find',
          created_at: r.created_at,
          comment_count: r.comment_count ?? 0,
        });
      } else if (r.category === 'report_missing' && missing.length < limitPerCategory) {
        missing.push({
          id: r.id,
          title: r.title,
          category: 'report_missing',
          created_at: r.created_at,
          comment_count: r.comment_count ?? 0,
        });
      }
    }

    return {
      find,
      missing,
      degraded: false,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return { ...empty, generatedAt: new Date().toISOString() };
  }
}
