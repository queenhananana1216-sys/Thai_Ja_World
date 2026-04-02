import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostAuthorMenu from '../_components/PostAuthorMenu';
import PostComments, { type CommentRow } from '../_components/PostComments';
import PostReactionsPanel from '../_components/PostReactionsPanel';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { categoryLabel } from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { formatDate } from '@/lib/utils/formatDate';

type PageProps = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = await createServerSupabaseAuthClient();
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, content, created_at, image_urls, author_hidden')
    .eq('id', postId)
    .eq('moderation_status', 'safe')
    .maybeSingle();

  if (!post) {
    return { title: d.board.pageTitle, robots: { index: false, follow: true } };
  }

  const noIndex = Boolean(post.author_hidden);
  const description = trimForMetaDescription(String(post.content ?? ''));
  const url = absoluteUrl(`/community/boards/${postId}`);
  const images = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
  const ogImage = typeof images[0] === 'string' ? images[0] : undefined;
  const titleStr = String(post.title ?? '');

  return {
    title: titleStr,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: titleStr,
      description,
      url,
      type: 'article',
      publishedTime: post.created_at as string,
      siteName: d.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: titleStr,
      description,
    },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function BoardPostDetailPage({ params }: PageProps) {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls, author_hidden, owner_edit_password_set',
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
  const pageUrl = absoluteUrl(path);
  const isAuthor = viewerId !== null && viewerId === (post.author_id as string);
  const authorHidden = Boolean(post.author_hidden);

  return (
    <div className="page-body board-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: post.title as string,
          ...(post.content
            ? { text: trimForMetaDescription(post.content as string, 8000) }
            : {}),
          datePublished: post.created_at as string,
          url: pageUrl,
          author: { '@type': 'Person', name: authorName },
        }}
      />
      <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
        ← {d.board.backToList}
      </Link>

      <article style={{ marginTop: 16 }}>
        <div className="board-post__meta">
          {cat} · {d.board.author} {authorName} · {formatDate(post.created_at as string | null)} ·{' '}
          {d.board.views} {post.view_count ?? 0}
          {authorHidden ? (
            <>
              {' '}
              · <span style={{ color: 'var(--tj-muted)' }}>{d.board.postPrivateBadge}</span>
            </>
          ) : null}
        </div>
        {isAuthor ? (
          <PostAuthorMenu
            postId={postId}
            authorHidden={authorHidden}
            ownerGateSet={Boolean((post as { owner_edit_password_set?: boolean }).owner_edit_password_set)}
            labels={{
              postOwnerMenu: d.board.postOwnerMenu,
              postDelete: d.board.postDelete,
              postMakePrivate: d.board.postMakePrivate,
              postMakePublic: d.board.postMakePublic,
              postDeleteConfirm: d.board.postDeleteConfirm,
              postBusy: d.board.postBusy,
              postActionError: d.board.postActionError,
              postEdit: d.board.postEdit,
              postOwnerPasswordPrompt: d.board.postOwnerPasswordPrompt,
              postOwnerPasswordPlaceholder: d.board.postOwnerPasswordPlaceholder,
              postOwnerPasswordSubmit: d.board.postOwnerPasswordSubmit,
              postOwnerPasswordCancel: d.board.postOwnerPasswordCancel,
              postOwnerPasswordRequired: d.board.postOwnerPasswordRequired,
              postOwnerPasswordWrong: d.board.postOwnerPasswordWrong,
            }}
          />
        ) : null}
        <PostReactionsPanel postId={postId} loginNextPath={path} />
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

      <PostComments
        postId={postId}
        initial={comments}
        labels={d.board}
        loginNextPath={path}
        showLoginHint={!viewerId}
      />
    </div>
  );
}
