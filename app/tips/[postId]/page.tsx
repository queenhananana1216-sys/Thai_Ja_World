import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostComments, { type CommentRow } from '../../community/boards/_components/PostComments';
import PostReactionsPanel from '../../community/boards/_components/PostReactionsPanel';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { trimForMetaDescription } from '@/lib/seo/site';

type PageProps = { params: Promise<{ postId: string }> };

type TipPostRow = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  created_at: string;
  author_id: string;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sb = await createServerSupabaseAuthClient();
  const { data } = await sb
    .from('posts')
    .select('id,title,excerpt,content')
    .eq('id', postId)
    .eq('category', 'info')
    .eq('is_knowledge_tip', true)
    .eq('moderation_status', 'safe')
    .maybeSingle();
  const row = data as Pick<TipPostRow, 'title' | 'excerpt' | 'content'> | null;
  if (!row) {
    return { title: d.tips.pageTitle, robots: { index: false, follow: true } };
  }
  const desc = trimForMetaDescription(row.excerpt || row.content || row.title);
  return {
    title: row.title,
    description: desc,
    robots: { index: true, follow: true },
  };
}

export default async function TipsTeaserPage({ params }: PageProps) {
  const { postId } = await params;
  if (!postId) notFound();

  const locale = await getLocale();
  const d = getDictionary(locale);
  const auth = await createServerSupabaseAuthClient();
  const { data: post, error } = await auth
    .from('posts')
    .select('id,title,content,excerpt,created_at,author_id')
    .eq('id', postId)
    .eq('category', 'info')
    .eq('is_knowledge_tip', true)
    .eq('moderation_status', 'safe')
    .maybeSingle();

  const {
    data: { user },
  } = await auth.auth.getUser();
  const viewerId = user?.id ?? null;

  if (error || !post) {
    notFound();
  }

  const tipRow = post as TipPostRow;
  const { data: commentsRaw } = await auth
    .from('comments')
    .select('id,content,created_at,author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const authorIds = [...new Set((commentsRaw ?? []).map((r) => String(r.author_id)))];
  const nameMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await auth.from('profiles').select('id,display_name').in('id', authorIds);
    for (const p of profs ?? []) {
      nameMap[String(p.id)] = (p.display_name as string) || 'member';
    }
  }
  const comments: CommentRow[] = (commentsRaw ?? []).map((r) => ({
    id: String(r.id),
    content: String(r.content ?? ''),
    created_at: String(r.created_at ?? ''),
    display_name: nameMap[String(r.author_id)] ?? 'member',
  }));
  const path = `/tips/${postId}`;

  return (
    <div className="page-body board-page">
      <p style={{ margin: '0 0 12px' }}>
        <Link href="/tips" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          ← {d.tips.backToList}
        </Link>
      </p>
      <article className="tips-teaser card" style={{ padding: 22, maxWidth: 720 }}>
        <h1 className="board-title" style={{ marginTop: 0 }}>
          {tipRow.title}
        </h1>
        {tipRow.content?.trim() ? (
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--tj-ink)', fontSize: '0.95rem' }}>
            {tipRow.content}
          </p>
        ) : tipRow.excerpt ? (
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'var(--tj-ink)', fontSize: '0.95rem' }}>
            {tipRow.excerpt}
          </p>
        ) : null}
        <PostReactionsPanel postId={postId} loginNextPath={path} />
      </article>
      <div style={{ maxWidth: 720, marginTop: 14 }}>
        <PostComments
          postId={postId}
          initial={comments}
          labels={d.board}
          loginNextPath={path}
          showLoginHint={!viewerId}
        />
      </div>
    </div>
  );
}
