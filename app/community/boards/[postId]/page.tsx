import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostComments, { type CommentRow } from '../_components/PostComments';
import { createServerClient } from '@/lib/supabase/server';
import { categoryLabel } from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { formatDate } from '@/lib/utils/formatDate';

type PageProps = { params: Promise<{ postId: string }> };

export default async function BoardPostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = createServerClient();

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls',
    )
    .eq('id', postId)
    .eq('moderation_status', 'safe')
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  const { data: authorRow } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', post.author_id as string)
    .maybeSingle();

  const authorName = (authorRow?.display_name as string) || 'member';

  const { data: rawComments } = await supabase
    .from('comments')
    .select('id, content, created_at, author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const commentAuthorIds = [...new Set((rawComments ?? []).map((c) => c.author_id as string))];
  let profs: { id: string; display_name: string | null }[] | null = [];
  if (commentAuthorIds.length > 0) {
    const q = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', commentAuthorIds);
    profs = q.data;
  }

  const nameMap: Record<string, string> = {};
  for (const row of profs ?? []) {
    nameMap[row.id as string] = (row.display_name as string) || 'member';
  }

  const comments: CommentRow[] = (rawComments ?? []).map((c) => ({
    id: c.id as string,
    content: c.content as string,
    created_at: c.created_at as string,
    display_name: nameMap[c.author_id as string] ?? 'member',
  }));

  const images = Array.isArray(post.image_urls) ? post.image_urls : [];
  const cat = categoryLabel(String(post.category), locale);
  const path = `/community/boards/${postId}`;

  return (
    <div className="page-body board-page">
      <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
        ← {d.board.backToList}
      </Link>

      <article style={{ marginTop: 16 }}>
        <div className="board-post__meta">
          {cat} · {d.board.author} {authorName} · {formatDate(post.created_at as string | null)} ·{' '}
          {d.board.views} {post.view_count ?? 0}
        </div>
        <h1 className="board-title" style={{ margin: '12px 0 16px' }}>
          {post.title as string}
        </h1>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.65 }}>
          {post.content as string}
        </div>
        {images.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt=""
            className="board-post__thumb"
            style={{ marginTop: 12 }}
          />
        ))}
      </article>

      <PostComments postId={postId} initial={comments} labels={d.board} loginNextPath={path} />
    </div>
  );
}
