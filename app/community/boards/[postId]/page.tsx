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
import { isCommunityPublicViewCountsEnabled } from '@/lib/community/publicViewCounts';
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
  const showViewCounts = isCommunityPublicViewCountsEnabled();
  const [{ data: relatedPostsRaw }, { data: relatedNewsRaw }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, updated_at')
      .eq('moderation_status', 'safe')
      .eq('is_knowledge_tip', false)
      .eq('category', String(post.category))
      .neq('id', postId)
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('processed_news')
      .select('id, created_at, raw_news(title)')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(4),
  ]);
  const relatedPosts = (relatedPostsRaw ?? []).map((item) => ({
    id: String(item.id),
    title: String(item.title ?? `Post ${item.id}`),
    updatedAt: String(item.updated_at ?? ''),
  }));
  const relatedNews = (relatedNewsRaw ?? []).map((item) => {
    const raw = item.raw_news as { title?: string } | null;
    return {
      id: String(item.id),
      title: String(raw?.title ?? `News ${item.id}`),
      createdAt: String(item.created_at ?? ''),
    };
  });

  const threadLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'DiscussionForumPosting',
    headline: post.title as string,
    ...(post.content ? { text: trimForMetaDescription(post.content as string, 8000) } : {}),
    datePublished: post.created_at as string,
    dateModified: post.created_at as string,
    url: pageUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    author: { '@type': 'Person', name: authorName },
    commentCount: Number(post.comment_count ?? 0),
  };
  if (showViewCounts) {
    threadLd.interactionStatistic = {
      '@type': 'InteractionCounter',
      interactionType: { '@type': 'http://schema.org/ViewAction' },
      userInteractionCount: Number(post.view_count ?? 0),
    };
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8">
      <JsonLd data={threadLd} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: absoluteUrl('/'),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: d.nav.community,
              item: absoluteUrl('/community/boards'),
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: String(post.title ?? 'post'),
              item: pageUrl,
            },
          ],
        }}
      />
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Link href="/community/boards" className="text-sm font-semibold text-violet-700 no-underline hover:underline">
          ← {d.board.backToList}
        </Link>
        <Link
          href="/ads"
          className="rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 no-underline transition hover:bg-violet-100"
        >
          광고/제휴 문의
        </Link>
      </div>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="text-xs font-medium text-slate-500">
          {cat} · {d.board.author} {authorName} · {formatDate(post.created_at as string | null)}
          {showViewCounts ? (
            <>
              {' '}
              · {d.board.views} {post.view_count ?? 0}
            </>
          ) : null}
          {authorHidden ? (
            <>
              {' '}
              · <span className="font-semibold text-violet-700">{d.board.postPrivateBadge}</span>
            </>
          ) : null}
        </div>
        {isAuthor ? (
          <div className="mt-3">
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
          </div>
        ) : null}
        <div className="mt-3">
          <PostReactionsPanel postId={postId} loginNextPath={path} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
          {post.title as string}
        </h1>
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
          {post.content as string}
        </div>
        {images.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt=""
            className="mt-4 w-full rounded-xl border border-slate-200 object-cover"
          />
        ))}
      </article>

      {(relatedPosts.length > 0 || relatedNews.length > 0) && (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">이 글 본 사람들이 함께 본 글</h2>
          {relatedPosts.length > 0 && (
            <div className={relatedNews.length > 0 ? 'mb-4' : ''}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">같은 카테고리 글</p>
              <ul className="m-0 list-disc space-y-1 pl-5">
                {relatedPosts.map((item) => (
                  <li key={item.id}>
                    <Link href={`/community/boards/${item.id}`} className="text-sm font-medium text-violet-700 no-underline hover:underline">
                      {item.title}
                    </Link>
                    {item.updatedAt ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {formatDate(item.updatedAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {relatedNews.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">관련 뉴스</p>
              <ul className="m-0 list-disc space-y-1 pl-5">
                {relatedNews.map((item) => (
                  <li key={item.id}>
                    <Link href={`/news/${item.id}`} className="text-sm font-medium text-violet-700 no-underline hover:underline">
                      {item.title}
                    </Link>
                    {item.createdAt ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {formatDate(item.createdAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <PostComments
        postId={postId}
        initial={comments}
        labels={d.board}
        loginNextPath={path}
        showLoginHint={!viewerId}
      />
    </main>
  );
}
