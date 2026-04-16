import Link from 'next/link';
import type { Metadata } from 'next';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const loc = await getLocale();
  const d = getDictionary(loc);
  return {
    title: d.tips.pageTitle,
    description: d.tips.pageLead,
    robots: { index: true, follow: true },
  };
}

type TipRow = { id: string; title: string; excerpt: string; created_at: string };

export default async function TipsHubPage() {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const t = d.tips;
  const sb = createServerClient();
  const { data, error } = await sb.rpc('get_tips_public', { limit_n: 50 });
  const rows = (Array.isArray(data) ? data : []) as TipRow[];

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{t.pageTitle}</h1>
      </div>
      <p style={{ margin: '0 0 12px', lineHeight: 1.6, color: 'var(--tj-muted)', fontSize: '0.92rem' }}>
        {t.pageLead}
      </p>
      <p style={{ margin: '0 0 22px', fontSize: '0.88rem' }}>
        <Link href="/news" style={{ color: 'var(--tj-link)', fontWeight: 600 }}>
          {t.crossLinkNewsHub}
        </Link>
      </p>

      {error ? (
        <p className="auth-inline-error" style={{ fontSize: '0.88rem' }}>
          {error.message}
        </p>
      ) : null}

      {!error && rows.length === 0 ? (
        <p style={{ color: 'var(--tj-muted)' }}>{t.empty}</p>
      ) : null}

      <ul className="tips-hub-list">
        {rows.map((r) => (
          <li key={r.id} className="tips-hub-card card">
            <h2 className="tips-hub-card__title">
              <Link href={`/tips/${r.id}`}>{r.title}</Link>
            </h2>
            {r.excerpt ? <p className="tips-hub-card__excerpt">{r.excerpt}</p> : null}
            <Link href={`/tips/${r.id}`} className="tips-hub-card__cta">
              {t.openCard} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
