import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewsComments, { type NewsCommentRow } from '../_components/NewsComments';
import portalStyles from '@app/portal/portal-2026.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import {
  listTitleSummaryFromProcessedNoRaw,
  newsDetailFromProcessed,
  passesKoPublicGate,
  passesPublishedNewsSearchGate,
} from '@/lib/news/processedNewsDisplay';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { extractHostname, formatDate } from '@/lib/utils/formatDate';

type PageProps = { params: Promise<{ id: string }> };

const AI_ERROR_PATTERN =
  /\b(?:error|429|too many requests|exceeded quota|quota exceeded|rate limit|rate-limited|llm|openai|anthropic|upstream)\b/i;

function hasAiPipelineErrorText(value: string | null | undefined): boolean {
  if (!value) return false;
  return AI_ERROR_PATTERN.test(value);
}

function shouldUseGracefulFallback(parts: {
  title: string;
  summary: string | null;
  blurb: string | null;
  editorNote: string | null;
  insightImpact: string | null;
  countermeasure: string | null;
}): boolean {
  return [parts.title, parts.summary, parts.blurb, parts.editorNote, parts.insightImpact, parts.countermeasure].some(
    (v) => hasAiPipelineErrorText(v),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const supabase = createServerClient();
  const { data: row, error: rowErr } = await supabase
    .from('processed_news')
    .select('id, clean_body, created_at, language, seo_keywords, summaries(summary_text, model)')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (rowErr || !row) {
    return { title: d.home.newsTitle, robots: { index: false, follow: true } };
  }

  const sumsMeta = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;
  if (!passesPublishedNewsSearchGate((row.clean_body as string | null) ?? null, sumsMeta)) {
    return { title: d.home.newsTitle, robots: { index: false, follow: true } };
  }

  const sums = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;

  const detail = newsDetailFromProcessed(
    row.clean_body as string | null,
    null,
    null,
    sums ?? null,
    locale,
    { allowRawTitleFallback: false },
  );
  const useGracefulFallback = shouldUseGracefulFallback(detail);

  const description = trimForMetaDescription(
    useGracefulFallback
      ? d.home.newsTitle
      : [detail.blurb, detail.insightImpact, detail.countermeasure, detail.summary]
          .filter(Boolean)
          .join(' ')
          .trim() || detail.title,
  );
  const url = absoluteUrl(`/news/${id}`);
  const datePublished = row.created_at as string;
  const seoKw = Array.isArray(row.seo_keywords)
    ? (row.seo_keywords as string[]).map((s) => String(s).trim()).filter(Boolean)
    : [];

  return {
    title: detail.title,
    description,
    ...(seoKw.length > 0 ? { keywords: seoKw } : {}),
    alternates: { canonical: url },
    openGraph: {
      title: detail.title,
      description,
      url,
      type: 'article',
      publishedTime: datePublished,
      siteName: d.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
    },
    twitter: { card: 'summary_large_image', title: detail.title, description },
    robots: { index: true, follow: true },
  };
}

export default async function NewsStoryPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const h = d.home;
  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();

  const supabase = createServerClient();

  const { data: row, error } = await supabase
    .from('processed_news')
    .select('id, clean_body, created_at, language, seo_keywords, summaries(summary_text, model)')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const sumsGate = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;
  if (!passesPublishedNewsSearchGate((row.clean_body as string | null) ?? null, sumsGate)) {
    notFound();
  }

  const sums = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;

  const detail = newsDetailFromProcessed(
    row.clean_body as string | null,
    null,
    null,
    sums ?? null,
    locale,
    { allowRawTitleFallback: false },
  );
  const useGracefulFallback = shouldUseGracefulFallback(detail);

  const { data: rawComments, error: commentsErr } = await supabase
    .from('news_comments')
    .select('id, content, created_at, author_id')
    .eq('processed_news_id', id)
    .order('created_at', { ascending: true });

  const commentRows = !commentsErr ? (rawComments ?? []) : [];
  const authorIds = [...new Set(commentRows.map((c) => c.author_id as string))];
  let profs: { id: string; display_name: string | null }[] | null = [];
  if (authorIds.length > 0) {
    const q = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', authorIds);
    profs = q.data;
  }

  const nameMap: Record<string, string> = {};
  for (const p of profs ?? []) {
    nameMap[p.id as string] = (p.display_name as string) || 'member';
  }

  const comments: NewsCommentRow[] = commentRows.map((c) => ({
    id: c.id as string,
    content: c.content as string,
    created_at: c.created_at as string,
    display_name: nameMap[c.author_id as string] ?? 'member',
    author_id: c.author_id as string,
  }));

  const path = `/news/${id}`;
  const pageUrl = absoluteUrl(path);
  const host = detail.sourceUrl ? extractHostname(detail.sourceUrl) : '';
  const datePublished = row.created_at as string;
  const jsonDesc = trimForMetaDescription(
    useGracefulFallback
      ? d.home.newsTitle
      : [detail.blurb, detail.summary].filter(Boolean).join(' ') || detail.title,
    8000,
  );
  const seoKeywords =
    Array.isArray(row.seo_keywords) && row.seo_keywords.length > 0
      ? (row.seo_keywords as string[]).map((s) => String(s).trim()).filter(Boolean)
      : [];
  const [{ data: relatedNewsRaw }, { data: relatedPostsRaw }] = await Promise.all([
    supabase
      .from('processed_news')
      .select('id, created_at, clean_body, language, summaries(summary_text, model)')
      .eq('published', true)
      .eq('language', 'ko')
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('posts')
      .select('id, title, updated_at, category')
      .eq('moderation_status', 'safe')
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);
  const locRelated = locale === 'th' ? 'th' : 'ko';
  const relatedNews = (relatedNewsRaw ?? [])
    .filter((item) =>
      passesKoPublicGate(
        item.language as string | null,
        (item.clean_body as string | null) ?? null,
        item.summaries as { summary_text: string; model: string | null }[] | null,
      ),
    )
    .map((item) => {
      const parsed = listTitleSummaryFromProcessedNoRaw(
        (item.clean_body as string | null) ?? null,
        item.summaries as { summary_text: string; model: string | null }[] | null,
        locRelated,
      );
      const title = parsed?.title?.trim();
      if (!title) return null;
      return {
        id: String(item.id),
        title,
        createdAt: String(item.created_at ?? ''),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .slice(0, 6);
  const relatedPosts = (relatedPostsRaw ?? []).map((item) => ({
    id: String(item.id),
    title: String(item.title ?? `Post ${item.id}`),
    updatedAt: String(item.updated_at ?? ''),
  }));

  return (
    <div className={portalStyles.root}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: detail.title,
          description: jsonDesc,
          datePublished,
          dateModified: row.created_at as string,
          url: pageUrl,
          mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
          publisher: {
            '@type': 'Organization',
            name: d.seo.defaultTitle,
            url: absoluteUrl('/'),
          },
          ...(seoKeywords.length > 0
            ? {
                keywords: seoKeywords.join(', '),
              }
            : {}),
          ...(detail.sourceUrl
            ? {
                isBasedOn: detail.sourceUrl,
              }
            : {}),
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
              name: d.home.newsTitle,
              item: absoluteUrl('/news'),
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: detail.title,
              item: pageUrl,
            },
          ],
        }}
      />
      <Link
        href="/news"
        className="inline-flex text-sm font-semibold text-amber-200 transition hover:text-amber-100 hover:underline"
      >
        {h.newsDetailBackToHub}
      </Link>
      <p
        className={`${portalStyles.glassBlue} mt-3 px-4 py-3 text-xs leading-relaxed text-slate-200`}
      >
        뉴스 발행은 관리자 전용입니다. 일반 회원은 본문 열람 및 댓글 참여만 가능합니다.
      </p>

      <article className={`${portalStyles.glassCenter} mt-5 overflow-hidden p-6 sm:p-8`}>
        <p className="mb-4 text-xs tracking-wide text-slate-400">
          {host && <span>🔗 {host}</span>}
          {row.created_at ? (
            <>
              {host ? ' · ' : ''}
              <span>🕐 {formatDate(row.created_at as string)}</span>
            </>
          ) : null}
        </p>
        <h1 className="mb-6 text-2xl font-bold leading-snug tracking-tight text-white sm:text-3xl md:text-4xl">
          {detail.title}
        </h1>

        {!useGracefulFallback && detail.blurb ? (
          <div className={`${portalStyles.glassGold} mb-6 p-4 sm:p-5`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100/90">
              {h.newsDetailWitLabel}
            </p>
            <p className="text-base leading-[1.75] tracking-[0.01em] text-slate-100 whitespace-pre-wrap wrap-break-word">
              {detail.blurb}
            </p>
          </div>
        ) : null}

        {!user ? (
          <div className={`${portalStyles.glassBlue} mt-2 p-4`}>
            <p className="m-0 text-base leading-relaxed tracking-[0.01em] text-slate-100">
              {h.newsDetailLockedLead}
            </p>
          </div>
        ) : null}

        {user && !useGracefulFallback && detail.summary ? (
          <div className="mt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              {h.newsDetailSummaryLabel}
            </p>
            <div className="text-lg leading-[1.9] tracking-[0.01em] text-slate-100 whitespace-pre-wrap wrap-break-word md:text-xl md:leading-[2]">
              {detail.summary}
            </div>
          </div>
        ) : null}

        {user && !useGracefulFallback && detail.editorNote ? (
          <div className={`${portalStyles.glassGold} mt-8 p-4 sm:p-5`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100/90">
              {h.newsDetailEditorLabel}
            </p>
            <p className="text-base leading-[1.85] text-slate-100 whitespace-pre-wrap wrap-break-word">
              {detail.editorNote}
            </p>
          </div>
        ) : null}

        {user && !useGracefulFallback && (detail.insightImpact?.trim() || detail.countermeasure?.trim()) ? (
          <div className={`${portalStyles.glassBlue} mt-8 p-4 sm:p-6`}>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-sky-200">
              {h.newsDetailInsightCardTitle}
            </p>
            {detail.insightImpact?.trim() ? (
              <div className="mb-5">
                <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                  {h.newsDetailImpactLabel}
                </p>
                <p className="text-base leading-[1.85] text-slate-100 whitespace-pre-wrap wrap-break-word">
                  {detail.insightImpact.trim()}
                </p>
              </div>
            ) : null}
            {detail.countermeasure?.trim() ? (
              <div>
                <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-slate-400">
                  {h.newsDetailCounterLabel}
                </p>
                <p className="text-base leading-[1.85] text-slate-100 whitespace-pre-wrap wrap-break-word">
                  {detail.countermeasure.trim()}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {user && useGracefulFallback ? (
          <div className={`${portalStyles.glassBlue} mt-8 p-4 sm:p-6`}>
            <p className="text-base leading-relaxed text-slate-100">
              💡 현지 리포터가 소식을 정리 중입니다. 운영팀 팩트체크가 끝나면 본문이 자동으로 반영됩니다. 급한 내용은 아래 원문 링크를 먼저 확인해 주세요.
            </p>
          </div>
        ) : null}

        {user && detail.sourceUrl ? (
          <p className="mt-8">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-400/45 bg-gradient-to-br from-slate-900/90 via-amber-950/40 to-slate-900/90 px-5 py-3 text-sm font-semibold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition hover:border-amber-300/70 hover:text-white"
            >
              {h.newsDetailExternalCta}
            </a>
            <span className="mt-2 block text-sm text-slate-400">
              {h.newsDetailExternalHint}
            </span>
          </p>
        ) : null}
      </article>

      {!user ? (
        <div className={`${portalStyles.glassCenter} mt-6 p-5 sm:p-6`}>
          <p className="mb-3 text-base leading-relaxed text-slate-100">
            {h.newsDetailGuestNote}
          </p>
          <p className="m-0 text-sm">
            <Link
              href={`/auth/login?next=${encodeURIComponent(path)}`}
              className="mr-3 font-semibold text-amber-200 hover:text-amber-100 hover:underline"
            >
              {d.board.login}
            </Link>
            <Link
              href={`/auth/signup?next=${encodeURIComponent(path)}`}
              className="font-semibold text-amber-200 hover:text-amber-100 hover:underline"
            >
              {d.board.signup}
            </Link>
          </p>
        </div>
      ) : null}

      {(relatedNews.length > 0 || relatedPosts.length > 0) && (
        <section className={`${portalStyles.glassBlue} mt-6 p-5 sm:p-6`}>
          <h2 className="mb-4 mt-0 text-lg font-bold text-white">더 읽을거리</h2>
          {relatedNews.length > 0 && (
            <div className={relatedPosts.length > 0 ? 'mb-4' : ''}>
              <p className="mb-2 text-xs font-medium text-slate-400">관련 뉴스</p>
              <ul className="m-0 list-disc pl-5">
                {relatedNews.map((item) => (
                  <li key={item.id} className="mb-1.5">
                    <Link href={`/news/${item.id}`} className="text-amber-200 hover:text-amber-100 hover:underline">
                      {item.title}
                    </Link>
                    {item.createdAt ? (
                      <span className="ml-2 text-xs text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {relatedPosts.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-slate-400">커뮤니티 인기 글</p>
              <ul className="m-0 list-disc pl-5">
                {relatedPosts.map((item) => (
                  <li key={item.id} className="mb-1.5">
                    <Link
                      href={`/community/boards/${item.id}`}
                      className="text-amber-200 hover:text-amber-100 hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.updatedAt ? (
                      <span className="ml-2 text-xs text-slate-400">
                        {formatDate(item.updatedAt)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <NewsComments
        processedNewsId={id}
        initial={comments}
        labels={d.board}
        loginNextPath={path}
        currentUserId={user?.id}
      />
      </div>
    </div>
  );
}
