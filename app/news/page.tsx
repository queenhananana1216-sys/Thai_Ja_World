import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { createServerClient } from '@/lib/supabase/server';
import { extractHostname, formatDate } from '@/lib/utils/formatDate';

const NEWS_HUB_LIMIT = 100;

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    title: d.home.newsTitle,
    description: d.home.newsSub,
    robots: { index: true, follow: true },
  };
}

export default async function NewsHubPage() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const h = d.home;

  const sb = createServerClient();
  const { data: processed, error } = await sb
    .from('processed_news')
    .select(
      'id, clean_body, raw_news(title, external_url, published_at), summaries(summary_text, model)',
    )
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(NEWS_HUB_LIMIT);

  const rows =
    (processed ?? []).map((pn) => {
      const rn = pn.raw_news as unknown as {
        title: string;
        external_url: string;
        published_at: string | null;
      } | null;
      const sums = pn.summaries as unknown as
        | { summary_text: string; model: string | null }[]
        | null;
      const { title, summary_text } = titleAndSummaryFromProcessed(
        (pn.clean_body as string | null) ?? null,
        rn?.title ?? null,
        sums ?? null,
        locale,
      );
      return {
        id: String(pn.id),
        title,
        summary_text,
        external_url: rn?.external_url ?? '#',
        published_at: rn?.published_at ?? null,
      };
    }) ?? [];

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{h.newsTitle}</h1>
      </div>
      <p style={{ margin: '0 0 12px', lineHeight: 1.6, color: 'var(--tj-muted)', fontSize: '0.92rem' }}>
        {h.newsSub}
      </p>
      <p style={{ margin: '0 0 22px', fontSize: '0.88rem' }}>
        <Link href="/tips" style={{ color: 'var(--tj-link)', fontWeight: 600 }}>
          {h.newsHubCrossLinkTips}
        </Link>
      </p>

      {error ? (
        <p className="auth-inline-error" style={{ fontSize: '0.88rem' }}>
          {error.message}
        </p>
      ) : null}

      {!error && rows.length === 0 ? <p style={{ color: 'var(--tj-muted)' }}>{h.newsEmpty}</p> : null}

      {!error && rows.length > 0 ? (
        <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'var(--tj-muted)' }}>
          {h.newsHubListingNote.replace('{n}', String(rows.length))}
        </p>
      ) : null}

      <ul className="tips-hub-list">
        {rows.map((r) => {
          const host = extractHostname(r.external_url);
          const date = formatDate(r.published_at);
          return (
            <li key={r.id} className="tips-hub-card card">
              <h2 className="tips-hub-card__title">
                <Link href={`/news/${r.id}`}>{r.title}</Link>
              </h2>
              {r.summary_text?.trim() ? (
                <p className="tips-hub-card__excerpt">{r.summary_text.trim()}</p>
              ) : null}
              <div className="news-card__meta" style={{ marginBottom: 8 }}>
                {host ? <span>🔗 {host}</span> : null}
                {date ? (
                  <span>
                    {host ? ' · ' : ''}
                    🕐 {date}
                  </span>
                ) : null}
              </div>
              <Link href={`/news/${r.id}`} className="tips-hub-card__cta">
                {h.newsHubOpenDetail}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
