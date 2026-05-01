import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewsComments, { type NewsCommentRow } from '../_components/NewsComments';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import {
  listTitleSummaryFromProcessedNoRaw,
  newsDetailFromProcessed,
  passesKoPublicGate,
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
}): boolean {
  return [parts.title, parts.summary, parts.blurb, parts.editorNote].some((v) =>
    hasAiPipelineErrorText(v),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = createServerClient();
  const { data: row } = await supabase
    .from('processed_news')
    .select(
      'id, clean_body, created_at, language, seo_keywords, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (!row) {
    return { title: d.home.newsTitle, robots: { index: false, follow: true } };
  }

  const sumsMeta = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;
  if (
    !passesKoPublicGate(
      row.language as string | null,
      (row.clean_body as string | null) ?? null,
      sumsMeta,
    )
  ) {
    return { title: d.home.newsTitle, robots: { index: false, follow: true } };
  }

  const rn = row.raw_news as unknown as {
    title: string;
    external_url: string;
    published_at: string | null;
  } | null;

  const sums = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;

  const detail = newsDetailFromProcessed(
    row.clean_body as string | null,
    rn?.title ?? null,
    rn?.external_url ?? null,
    sums ?? null,
    locale,
    { allowRawTitleFallback: false },
  );
  const useGracefulFallback = shouldUseGracefulFallback(detail);

  const description = trimForMetaDescription(
    useGracefulFallback
      ? d.home.newsTitle
      : [detail.blurb, detail.summary].filter(Boolean).join(' ') || detail.title,
  );
  const url = absoluteUrl(`/news/${id}`);
  const datePublished = rn?.published_at ?? (row.created_at as string);
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
  const d = getDictionary(locale);
  const h = d.home;
  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();

  const supabase = createServerClient();

  const { data: row, error } = await supabase
    .from('processed_news')
    .select(
      'id, clean_body, created_at, language, seo_keywords, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const sumsGate = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;
  if (
    !passesKoPublicGate(
      row.language as string | null,
      (row.clean_body as string | null) ?? null,
      sumsGate,
    )
  ) {
    notFound();
  }

  const rn = row.raw_news as unknown as {
    title: string;
    external_url: string;
    published_at: string | null;
  } | null;

  const sums = row.summaries as unknown as
    | { summary_text: string; model: string | null }[]
    | null;

  const detail = newsDetailFromProcessed(
    row.clean_body as string | null,
    rn?.title ?? null,
    rn?.external_url ?? null,
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
  const datePublished = rn?.published_at ?? (row.created_at as string);
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
      .or('language.eq.ko,language.is.null')
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
    <div className="min-h-screen bg-[#151921] text-slate-200">
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
        className="inline-flex text-sm font-medium text-sky-300 transition hover:text-sky-200"
      >
        {h.newsDetailBackToHub}
      </Link>
      <p className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-xs text-slate-400">
        뉴스 발행은 관리자 전용입니다. 일반 회원은 본문 열람 및 댓글 참여만 가능합니다.
      </p>

      <article className="mt-5 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.4)] sm:p-7">
        <p className="mb-3 text-xs tracking-wide text-slate-400">
          {host && <span>🔗 {host}</span>}
          {rn?.published_at && (
            <>
              {host ? ' · ' : ''}
              <span>🕐 {formatDate(rn.published_at)}</span>
            </>
          )}
        </p>
        <h1 className="mb-5 text-2xl font-semibold leading-tight tracking-tight text-slate-100 sm:text-3xl">
          {detail.title}
        </h1>

        {!useGracefulFallback && detail.blurb ? (
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {h.newsDetailWitLabel}
            </p>
            <p className="leading-relaxed tracking-[0.01em] text-slate-200 whitespace-pre-wrap wrap-break-word">
              {detail.blurb}
            </p>
          </div>
        ) : null}

        {!user ? (
          <div className="mt-5 rounded-2xl border border-indigo-400/30 bg-linear-to-br from-slate-900/90 via-indigo-950/45 to-slate-900/90 p-4">
            <p className="m-0 text-sm leading-relaxed tracking-[0.01em] text-slate-200">
              {h.newsDetailLockedLead}
            </p>
          </div>
        ) : null}

        {user && !useGracefulFallback && detail.summary ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-slate-400">
              {h.newsDetailSummaryLabel}
            </p>
            <div className="text-[0.97rem] leading-relaxed tracking-[0.01em] text-slate-200 whitespace-pre-wrap wrap-break-word">
              {detail.summary}
            </div>
          </div>
        ) : null}

        {user && !useGracefulFallback && detail.editorNote ? (
          <div className="mt-6 rounded-2xl border border-slate-700/70 bg-slate-800/65 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {h.newsDetailEditorLabel}
            </p>
            <p className="leading-relaxed tracking-[0.01em] text-slate-200 whitespace-pre-wrap wrap-break-word">
              {detail.editorNote}
            </p>
          </div>
        ) : null}

        {user && useGracefulFallback ? (
          <div className="mt-6 rounded-2xl border border-sky-400/25 bg-linear-to-br from-slate-900/95 via-sky-950/30 to-slate-900/95 p-4 sm:p-5">
            <p className="text-sm leading-relaxed tracking-[0.01em] text-slate-200">
              💡 현재 AI가 최신 정보를 정밀하게 번역 및 요약하고 있습니다. 아래 버튼을 통해 원문 기사를 먼저 확인해 주세요.
            </p>
          </div>
        ) : null}

        {user && detail.sourceUrl ? (
          <p className="mt-7">
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-sky-300/35 bg-linear-to-br from-slate-800/85 via-sky-900/60 to-slate-900/85 px-4 py-2.5 text-sm font-semibold text-sky-100 backdrop-blur-md transition hover:border-sky-200/55 hover:text-white"
            >
              {h.newsDetailExternalCta}
            </a>
            <span className="mt-2 block text-xs text-slate-400">
              {h.newsDetailExternalHint}
            </span>
          </p>
        ) : null}
      </article>

      {!user ? (
        <div className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5">
          <p className="mb-3 text-sm leading-relaxed text-slate-200">
            {h.newsDetailGuestNote}
          </p>
          <p className="m-0 text-sm">
            <Link
              href={`/auth/login?next=${encodeURIComponent(path)}`}
              className="mr-3 font-semibold text-sky-300 hover:text-sky-200"
            >
              {d.board.login}
            </Link>
            <Link
              href={`/auth/signup?next=${encodeURIComponent(path)}`}
              className="font-semibold text-sky-300 hover:text-sky-200"
            >
              {d.board.signup}
            </Link>
          </p>
        </div>
      ) : null}

      {(relatedNews.length > 0 || relatedPosts.length > 0) && (
        <section className="mt-6 rounded-2xl border border-slate-700/80 bg-slate-900/75 p-5">
          <h2 className="mb-3 mt-0 text-base font-semibold text-slate-100">더 읽을거리</h2>
          {relatedNews.length > 0 && (
            <div className={relatedPosts.length > 0 ? 'mb-4' : ''}>
              <p className="mb-2 text-xs text-slate-400">관련 뉴스</p>
              <ul className="m-0 list-disc pl-5">
                {relatedNews.map((item) => (
                  <li key={item.id} className="mb-1.5">
                    <Link href={`/news/${item.id}`} className="text-sky-300 hover:text-sky-200">
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
                      className="text-sky-300 hover:text-sky-200"
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
