import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { trimForMetaDescription } from '@/lib/seo/site';
import { getFallbackTipById } from '@/lib/tips/fallbackTips';

type PageProps = { params: Promise<{ postId: string }> };

type TipRow = { id: string; title: string; excerpt: string; created_at: string };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const locale = await getLocale();
  const d = getDictionary(locale);
  const sb = createServerClient();
  const { data } = await sb.rpc('get_tip_public', { p_id: postId });
  const row = Array.isArray(data) && data[0] ? (data[0] as TipRow) : null;
  const fallbackRow = row ? null : getFallbackTipById(postId, locale);
  if (!row) {
    if (!fallbackRow) {
      return { title: d.tips.pageTitle, robots: { index: false, follow: true } };
    }
    const fallbackDesc = trimForMetaDescription(fallbackRow.excerpt || fallbackRow.title);
    return {
      title: fallbackRow.title,
      description: fallbackDesc,
      robots: { index: true, follow: true },
    };
  }
  const desc = trimForMetaDescription(row.excerpt || row.title);
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
  const t = d.tips;
  const sb = createServerClient();
  const { data, error } = await sb.rpc('get_tip_public', { p_id: postId });
  const row = Array.isArray(data) && data[0] ? (data[0] as TipRow) : null;
  const fallbackRow = row ? null : getFallbackTipById(postId, locale);

  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (user && row) {
    redirect(`/community/boards/${postId}`);
  }

  if ((error && !fallbackRow) || (!row && !fallbackRow)) {
    notFound();
  }

  if (fallbackRow) {
    return (
      <div className="page-body board-page">
        <p style={{ margin: '0 0 12px' }}>
          <Link href="/tips" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
            ← {t.backToList}
          </Link>
        </p>
        <article className="tips-teaser card" style={{ padding: 22, maxWidth: 720 }}>
          <h1 className="board-title" style={{ marginTop: 0 }}>
            {fallbackRow.title}
          </h1>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'var(--tj-ink)', fontSize: '0.95rem' }}>
            {fallbackRow.body}
          </p>
          <section style={{ marginTop: 20 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700 }}>
              {t.fallbackChecklistTitle}
            </h2>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--tj-ink)', lineHeight: 1.6 }}>
              {fallbackRow.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: 'rgba(245, 245, 247, 0.8)',
              border: '1px solid rgba(229, 231, 235, 0.9)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '0.94rem', fontWeight: 700 }}>
              {t.fallbackCautionsTitle}
            </h2>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--tj-muted)', lineHeight: 1.55 }}>
              {fallbackRow.cautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {fallbackRow.sourceUrl ? (
            <p style={{ margin: '14px 0 0', fontSize: '0.82rem', color: 'var(--tj-muted)' }}>
              {t.fallbackSourceLabel}:{' '}
              <a href={fallbackRow.sourceUrl} target="_blank" rel="noopener noreferrer">
                {fallbackRow.sourceUrl}
              </a>
            </p>
          ) : null}
        </article>
      </div>
    );
  }

  const tipRow = row as TipRow;

  const nextLogin = `/auth/login?next=${encodeURIComponent(`/community/boards/${postId}`)}`;
  const nextSignup = `/auth/signup?next=${encodeURIComponent(`/community/boards/${postId}`)}`;

  return (
    <div className="page-body board-page">
      <p style={{ margin: '0 0 12px' }}>
        <Link href="/tips" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          ← {t.backToList}
        </Link>
      </p>
      <article className="tips-teaser card" style={{ padding: 22, maxWidth: 720 }}>
        <h1 className="board-title" style={{ marginTop: 0 }}>
          {tipRow.title}
        </h1>
        {tipRow.excerpt ? (
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, color: 'var(--tj-ink)', fontSize: '0.95rem' }}>
            {tipRow.excerpt}
          </p>
        ) : null}
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(237, 233, 254, 0.5)',
            border: '1px solid rgba(196, 181, 253, 0.45)',
          }}
        >
          <p style={{ margin: '0 0 14px', fontSize: '0.88rem', lineHeight: 1.55, color: 'var(--tj-muted)' }}>
            {t.detailLockedLead}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link href={nextLogin} className="board-form__submit" style={{ textAlign: 'center' }}>
              {t.loginForFull}
            </Link>
            <Link
              href={nextSignup}
              className="board-form__submit"
              style={{
                textAlign: 'center',
                background: '#fff',
                color: 'var(--tj-ink)',
                border: '1px solid var(--tj-line)',
              }}
            >
              {t.signupForFull}
            </Link>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: '0.8rem', color: 'var(--tj-muted)' }}>
            {t.goLogin} · {t.goSignup}
          </p>
        </div>
      </article>
    </div>
  );
}
