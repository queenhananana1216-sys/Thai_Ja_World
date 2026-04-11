import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import NewsComments, { type NewsCommentRow } from '../_components/NewsComments';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { newsDetailFromProcessed } from '@/lib/news/processedNewsDisplay';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { extractHostname, formatDate } from '@/lib/utils/formatDate';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const supabase = createServerClient();
  const { data: row } = await supabase
    .from('processed_news')
    .select(
      'id, clean_body, created_at, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (!row) {
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
  );

  const description = trimForMetaDescription(
    [detail.blurb, detail.summary].filter(Boolean).join(' ') || detail.title,
  );
  const url = absoluteUrl(`/news/${id}`);
  const datePublished = rn?.published_at ?? (row.created_at as string);

  return {
    title: detail.title,
    description,
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
      'id, clean_body, created_at, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  if (error || !row) {
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
  );

  let comments: NewsCommentRow[] = [];
  if (user) {
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

    comments = commentRows.map((c) => ({
      id: c.id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      display_name: nameMap[c.author_id as string] ?? 'member',
      author_id: c.author_id as string,
    }));
  }

  const path = `/news/${id}`;
  const pageUrl = absoluteUrl(path);
  const host = detail.sourceUrl ? extractHostname(detail.sourceUrl) : '';
  const datePublished = rn?.published_at ?? (row.created_at as string);
  const jsonDesc = trimForMetaDescription(
    [detail.blurb, detail.summary].filter(Boolean).join(' ') || detail.title,
    8000,
  );
  const [{ data: relatedNewsRaw }, { data: relatedPostsRaw }] = await Promise.all([
    supabase
      .from('processed_news')
      .select('id, created_at, raw_news(title)')
      .eq('published', true)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('posts')
      .select('id, title, updated_at, category')
      .eq('moderation_status', 'safe')
      .order('updated_at', { ascending: false })
      .limit(6),
  ]);
  const relatedNews = (relatedNewsRaw ?? []).map((item) => {
    const raw = item.raw_news as { title?: string } | null;
    return {
      id: String(item.id),
      title: String(raw?.title ?? `News ${item.id}`),
      createdAt: String(item.created_at ?? ''),
    };
  });
  const relatedPosts = (relatedPostsRaw ?? []).map((item) => ({
    id: String(item.id),
    title: String(item.title ?? `Post ${item.id}`),
    updatedAt: String(item.updated_at ?? ''),
  }));

  return (
    <div className="page-body board-page">
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
      <Link href="/" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
        {h.newsDetailBack}
      </Link>

      <article className="news-story" style={{ marginTop: 18 }}>
        <p className="board-post__meta" style={{ marginBottom: 8 }}>
          {host && <span>🔗 {host}</span>}
          {rn?.published_at && (
            <>
              {host ? ' · ' : ''}
              <span>🕐 {formatDate(rn.published_at)}</span>
            </>
          )}
        </p>
        <h1 className="board-title" style={{ margin: '0 0 14px' }}>
          {detail.title}
        </h1>

        {detail.blurb && (
          <div className="news-story__wit">
            <p className="news-story__wit-label">{h.newsDetailWitLabel}</p>
            <p className="news-story__wit-body">{detail.blurb}</p>
          </div>
        )}

        {!user ? (
          <div
            className="news-story__lock-banner card"
            style={{
              marginTop: 20,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)',
              border: '1px solid #e9d5ff',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--tj-ink)' }}>
              {h.newsDetailLockedLead}
            </p>
          </div>
        ) : null}

        {user && detail.summary ? (
          <div style={{ marginTop: 20 }}>
            <p
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--tj-muted)',
                margin: '0 0 8px',
                letterSpacing: '0.04em',
              }}
            >
              {h.newsDetailSummaryLabel}
            </p>
            <div
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: 'var(--tj-ink)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {detail.summary}
            </div>
          </div>
        ) : null}

        {user && detail.editorNote ? (
          <div className="news-story__editor" style={{ marginTop: 22 }}>
            <p className="news-story__editor-label">{h.newsDetailEditorLabel}</p>
            <p className="news-story__editor-body">{detail.editorNote}</p>
          </div>
        ) : null}

        {user && detail.sourceUrl ? (
          <p style={{ marginTop: 28 }}>
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="board-form__submit"
              style={{
                display: 'inline-block',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              {h.newsDetailExternalCta}
            </a>
            <span
              style={{
                display: 'block',
                marginTop: 8,
                fontSize: '0.72rem',
                color: '#94a3b8',
              }}
            >
              {h.newsDetailExternalHint}
            </span>
          </p>
        ) : null}
      </article>

      {!user ? (
        <div className="news-story__guest-note card" style={{ marginTop: 22, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--tj-ink)' }}>
            {h.newsDetailGuestNote}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link
              href={`/auth/login?next=${encodeURIComponent(path)}`}
              style={{ color: 'var(--tj-link)', fontWeight: 600, marginRight: 12 }}
            >
              {d.board.login}
            </Link>
            <Link
              href={`/auth/signup?next=${encodeURIComponent(path)}`}
              style={{ color: 'var(--tj-link)', fontWeight: 600 }}
            >
              {d.board.signup}
            </Link>
          </p>
        </div>
      ) : null}

      {(relatedNews.length > 0 || relatedPosts.length > 0) && (
        <section className="card" style={{ marginTop: 24, padding: 18 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: '1rem' }}>더 읽을거리</h2>
          {relatedNews.length > 0 && (
            <div style={{ marginBottom: relatedPosts.length > 0 ? 14 : 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>관련 뉴스</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {relatedNews.map((item) => (
                  <li key={item.id} style={{ marginBottom: 6 }}>
                    <Link href={`/news/${item.id}`} style={{ color: 'var(--tj-link)' }}>
                      {item.title}
                    </Link>
                    {item.createdAt ? (
                      <span style={{ marginLeft: 8, color: 'var(--tj-muted)', fontSize: '0.78rem' }}>
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
              <p style={{ margin: '0 0 8px', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>
                커뮤니티 인기 글
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {relatedPosts.map((item) => (
                  <li key={item.id} style={{ marginBottom: 6 }}>
                    <Link href={`/community/boards/${item.id}`} style={{ color: 'var(--tj-link)' }}>
                      {item.title}
                    </Link>
                    {item.updatedAt ? (
                      <span style={{ marginLeft: 8, color: 'var(--tj-muted)', fontSize: '0.78rem' }}>
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

      {user ? (
        <NewsComments
          processedNewsId={id}
          initial={comments}
          labels={d.board}
          loginNextPath={path}
          currentUserId={user.id}
        />
      ) : null}
    </div>
  );
}
