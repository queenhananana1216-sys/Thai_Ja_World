import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { BoardDetailClient } from '../_components/BoardDetailClient';
import type { BoardReportCommentRow } from '../_components/BoardReportComments';
import type { BoardPostRow } from '../_components/types';

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = createServerClient();
  const { data, error } = await sb.from('board_posts').select('*').eq('id', id).maybeSingle();

  if (error || !data) {
    notFound();
  }

  const post = data as BoardPostRow;

  let reportComments: BoardReportCommentRow[] = [];
  if (post.board_type === 'reports') {
    const { data: rawComments } = await sb
      .from('board_post_comments')
      .select('id, content, created_at, author_id, parent_comment_id')
      .eq('board_post_id', id)
      .order('created_at', { ascending: true });

    const authorIds = [...new Set((rawComments ?? []).map((c) => String(c.author_id)))];
    let profs: { id: string; display_name: string | null }[] = [];
    if (authorIds.length > 0) {
      const q = await sb.from('profiles').select('id, display_name').in('id', authorIds);
      profs = q.data ?? [];
    }
    const nameById = new Map(profs.map((p) => [p.id, (p.display_name ?? '').trim() || 'member']));

    reportComments = (rawComments ?? []).map((c) => ({
      id: String(c.id),
      content: String(c.content ?? ''),
      created_at: String(c.created_at ?? ''),
      author_id: String(c.author_id),
      parent_comment_id: c.parent_comment_id ? String(c.parent_comment_id) : null,
      display_name: nameById.get(String(c.author_id)) ?? 'member',
    }));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BoardDetailClient post={post} reportComments={reportComments} />
    </div>
  );
}
