import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PostComments, { type CommentRow } from '../../community/boards/_components/PostComments';
import PostReactionsPanel from '../../community/boards/_components/PostReactionsPanel';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

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
    alternates: { canonical: absoluteUrl(`/tips/${encodeURIComponent(postId)}`) },
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
    .select('id,content,created_at,author_id,parent_comment_id')
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
    parent_comment_id: r.parent_comment_id ? String(r.parent_comment_id) : null,
  }));
  const path = `/tips/${postId}`;

  return (
    <div className="page-body board-page">
      <p className="mb-3">
        <Link
          href="/tips"
          className="inline-flex text-sm font-semibold text-amber-200 transition hover:text-amber-100 hover:underline"
        >
          ← {d.tips.backToList}
        </Link>
      </p>
      <article className="tips-teaser max-w-[720px] rounded-xl border border-gray-700 bg-gray-800/50 p-6 text-gray-200 backdrop-blur-md sm:p-8">
        <h1 className="mb-4 mt-0 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl">
          {tipRow.title}
        </h1>
        {tipRow.content?.trim() ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.7] text-slate-100">
            {tipRow.content}
          </p>
        ) : tipRow.excerpt ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-[1.65] text-slate-100">
            {tipRow.excerpt}
          </p>
        ) : null}
        <PostReactionsPanel postId={postId} loginNextPath={path} />
      </article>

      <div id="post-comments" className="mt-5 w-full max-w-[720px]">
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
