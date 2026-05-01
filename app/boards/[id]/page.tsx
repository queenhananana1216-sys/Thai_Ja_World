import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { BoardDetailClient } from '../_components/BoardDetailClient';
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

  return (
    <div className="mx-auto max-w-3xl">
      <BoardDetailClient post={data as BoardPostRow} />
    </div>
  );
}
