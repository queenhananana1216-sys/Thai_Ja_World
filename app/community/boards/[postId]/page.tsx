import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostAuthorMenu from '../_components/PostAuthorMenu';
import PostEngagementActions from '../_components/PostEngagementActions';
import PostComments, { type CommentRow } from '../_components/PostComments';
import PostReactionsPanel from '../_components/PostReactionsPanel';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { categoryLabel } from '@/lib/community/postCategories';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { mergeDictionarySiteBrand } from '@/lib/site-brand/mergeDictionaryBrand';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { parsePostAiInsightV1 } from '@/lib/community/postAiInsightDisplay';
import { formatDate } from '@/lib/utils/formatDate';
import { getPerceivedViewCount } from '@/lib/utils';
import {
  extractGuestBlurPreview,
  shouldBlurCommunityPostForGuest,
} from '@/lib/community/postGuestBlurTrap';
import PostBodyGuestBlur from '../_components/PostBodyGuestBlur';
import PostAiInsightSection from '../_components/PostAiInsightSection';

/** 존재하지 않는 글은 캐시된 404 대신 즉시 `notFound()` — Radar 404 루프 완화 */
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ postId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const locale = await getLocale();
  const siteUi = await loadSiteUiSettings();
  const d = mergeDictionarySiteBrand(getDictionary(locale), siteUi.siteDisplayName);
  const supabase = await createServerSupabaseAuthClient();
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, content, created_at, image_urls, author_hidden, category, location_name, ai_insight')
    .eq('id', postId)
    .eq('moderation_status', 'safe')
    .maybeSingle();

  if (!post) {
    return { title: d.board.pageTitle, robots: { index: false, follow: true } };
  }

  const noIndex = Boolean(post.author_hidden);
  const bodyExcerpt = trimForMetaDescription(String(post.content ?? ''));
  const insight = parsePostAiInsightV1((post as { ai_insight?: unknown }).ai_insight);
  const block = locale === 'th' ? insight?.display?.th ?? insight?.display?.ko : insight?.display?.ko;
  const wit = block?.summary?.trim() ?? '';
  const counterKw = block?.countermeasure?.trim() ?? '';
  const description = trimForMetaDescription(
    [wit, counterKw, bodyExcerpt].filter(Boolean).join(' — '),
  );
  const url = absoluteUrl(`/community/boards/${postId}`);
  const images = Array.isArray(post.image_urls) ? (post.image_urls as string[]) : [];
  const ogImage = typeof images[0] === 'string' ? images[0] : undefined;
  let titleStr = String(post.title ?? '');
  if (wit && titleStr.length < 52) {
    const merged = `${titleStr} — ${wit}`.replace(/\s+/g, ' ').trim();
    titleStr = merged.length > 62 ? `${merged.slice(0, 59)}…` : merged;
  }
  const catKey = String(post.category ?? '');
  const catLabel = categoryLabel(catKey, locale);
  const locName = String((post as { location_name?: string | null }).location_name ?? '').trim();
  const counterTokens = counterKw
    ? counterKw
        .split(/[\s,.;]+/)
        .filter((w) => w.length > 1)
        .slice(0, 5)
    : [];
  const keywords = [
    catLabel,
    catKey,
    siteUi.siteDisplayName,
    '태국',
    '방콕',
    '교민',
    locale === 'th' ? 'ชุมชน' : '커뮤니티',
    ...(locName ? [locName] : []),
    ...counterTokens,
  ];

  return {
    title: titleStr,
    description,
    keywords,
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
  const siteUi = await loadSiteUiSettings();
  const d = mergeDictionarySiteBrand(getDictionary(locale), siteUi.siteDisplayName);
  const supabase = await createServerSupabaseAuthClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const viewerId = viewer?.id ?? null;

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      'id, title, content, category, created_at, comment_count, view_count, author_id, image_urls, author_hidden, owner_edit_password_set, is_knowledge_tip, latitude, longitude, location_name, ai_insight',
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
    .select('id, content, created_at, author_id, parent_comment_id')
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
    parent_comment_id: c.parent_comment_id ? String(c.parent_comment_id) : null,
  }));

  const images = Array.isArray(post.image_urls) ? post.image_urls : [];
  const cat = categoryLabel(String(post.category), locale);
  const path = `/community/boards/${postId}`;
  const pageUrl = absoluteUrl(path);
  const isAuthor = viewerId !== null && viewerId === (post.author_id as string);
  const authorHidden = Boolean(post.author_hidden);
  const knowledgeTip = Boolean((post as { is_knowledge_tip?: boolean }).is_knowledge_tip);
  const blurTrapActive =
    !viewerId &&
    !isAuthor &&
    shouldBlurCommunityPostForGuest({
      title: String(post.title ?? ''),
      category: String(post.category ?? ''),
      view_count: Number(post.view_count ?? 0),
      comment_count: Number(post.comment_count ?? 0),
      is_knowledge_tip: knowledgeTip,
    });
  const bodyForGuestBlur = blurTrapActive
    ? extractGuestBlurPreview(String(post.content ?? ''))
    : String(post.content ?? '');
  const perceivedReadLine =
    locale === 'th'
      ? `🔥 อ่านแล้ว ${getPerceivedViewCount(Number(post.view_count ?? 0), postId).toLocaleString('th-TH')} คน`
      : `🔥 ${getPerceivedViewCount(Number(post.view_count ?? 0), postId).toLocaleString('ko-KR')}명이 읽음`;
  const { data: relatedPostsRaw, error: relatedPostsError } = await supabase
    .from('posts')
    .select('id, title, created_at, comment_count, view_count')
    .eq('moderation_status', 'safe')
    .eq('is_knowledge_tip', false)
    .eq('author_hidden', false)
    .eq('category', String(post.category))
    .neq('id', postId)
    .order('created_at', { ascending: false })
    .limit(5);
  const relatedPosts = (relatedPostsRaw ?? []).map((item) => ({
    id: String(item.id),
    title: String(item.title ?? `Post ${item.id}`),
    createdAt: String(item.created_at ?? ''),
    commentCount: Number(item.comment_count ?? 0),
    viewCount: Number(item.view_count ?? 0),
  }));

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'DiscussionForumPosting',
          headline: post.title as string,
          ...(post.content
            ? { text: trimForMetaDescription(post.content as string, 8000) }
            : {}),
          datePublished: post.created_at as string,
          dateModified: post.created_at as string,
          url: pageUrl,
          mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
          author: { '@type': 'Person', name: authorName },
          commentCount: Number(post.comment_count ?? 0),
          interactionStatistic: {
            '@type': 'InteractionCounter',
            interactionType: { '@type': 'http://schema.org/ViewAction' },
            userInteractionCount: Number(post.view_count ?? 0),
          },
        }}
      />
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
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 shadow-[0_12px_35px_rgba(2,6,23,0.45)] backdrop-blur-md">
        <Link href="/community/boards" className="text-sm font-semibold text-slate-200 no-underline hover:text-white hover:underline">
          ← {d.board.backToList}
        </Link>
        <Link
          href="/ads"
          className="rounded-full border border-violet-300/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200 no-underline transition hover:bg-violet-500/20"
        >
          광고/제휴 문의
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <article className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-[0_14px_40px_rgba(2,6,23,0.52)] backdrop-blur-md sm:p-7">
        <div className="text-xs font-medium text-slate-300/80">
          {cat} · {d.board.author} {authorName} · {formatDate(post.created_at as string | null)} ·{' '}
          {perceivedReadLine}
          {authorHidden ? (
            <>
              {' '}
              · <span className="font-semibold text-violet-200">{d.board.postPrivateBadge}</span>
            </>
          ) : null}
        </div>
        {(() => {
          const lat = (post as { latitude?: number | null }).latitude;
          const lng = (post as { longitude?: number | null }).longitude;
          const loc = String((post as { location_name?: string | null }).location_name ?? '').trim();
          const hasCoords =
            lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
          if (!hasCoords && !loc) return null;
          return (
            <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-300">
              <span className="font-semibold text-slate-200">
                {locale === 'th' ? 'สถานที่' : '위치'}
              </span>
              {loc ? <span className="ml-2">{loc}</span> : null}
              {hasCoords ? (
                <span className="ml-2 font-mono text-slate-400">
                  {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                </span>
              ) : null}
            </div>
          );
        })()}
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
        <div id="post-reactions" className="mt-3">
          <PostReactionsPanel postId={postId} loginNextPath={path} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
          {post.title as string}
        </h1>
        <PostBodyGuestBlur
          gateActive={blurTrapActive}
          bodyText={bodyForGuestBlur}
          loginNextPath={path}
        />
        <div className="mt-6 border-t border-white/10 pt-4">
          <PostEngagementActions postPath={path} isLoggedIn={Boolean(viewerId)} />
        </div>
        {!blurTrapActive
          ? images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="mt-4 w-full rounded-xl border border-white/10 object-cover"
              />
            ))
          : null}
        <PostAiInsightSection
          aiInsight={(post as { ai_insight?: unknown }).ai_insight}
          locale={locale}
          labels={{
            aiInsightBlockTitle: d.board.aiInsightBlockTitle,
            aiInsightSummaryLabel: d.board.aiInsightSummaryLabel,
            aiInsightImpactLabel: d.board.aiInsightImpactLabel,
            aiInsightCounterLabel: d.board.aiInsightCounterLabel,
          }}
        />
        </article>
      </div>

      {!relatedPostsError && relatedPosts.length > 0 && (
        <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900/50 p-5 shadow-[0_10px_35px_rgba(2,6,23,0.45)] backdrop-blur-md">
          <h2 className="mb-1 text-base font-bold text-slate-100">이 게시판의 최신 핫게시글</h2>
          <p className="mb-3 text-xs font-medium text-slate-400">같은 카테고리 최신 글을 보여드려요.</p>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2">
            {relatedPosts.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 transition hover:bg-slate-800/50">
                <Link
                  href={`/community/boards/${item.id}`}
                  className="block truncate text-sm font-semibold text-slate-100 no-underline hover:text-white"
                  title={item.title}
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-slate-400">
                  댓글 {item.commentCount} · {formatDate(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div id="post-comments" className="mt-5">
        <PostComments
          postId={postId}
          initial={comments}
          labels={d.board}
          loginNextPath={path}
          showLoginHint={!viewerId}
        />
      </div>
    </main>
  );
}
