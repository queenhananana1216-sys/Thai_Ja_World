import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export default async function MinihomePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length < 4) notFound();

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_minihomes')
    .select('public_slug, title, tagline, is_public')
    .eq('public_slug', slug)
    .maybeSingle();

  if (error || !data || !data.is_public) notFound();

  const locale = await getLocale();
  const d = getDictionary(locale);
  const m = d.minihome;

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{data.title ?? data.public_slug}</h1>
        <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          {d.nav.community}
        </Link>
      </div>
      {data.tagline ? (
        <p style={{ margin: '0 0 20px', color: '#475569', fontSize: '0.95rem' }}>{data.tagline}</p>
      ) : null}

      <div className="card" style={{ padding: 18, marginBottom: 12, opacity: 0.72 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{m.guestbookLocked}</p>
      </div>
      <div className="card" style={{ padding: 18, opacity: 0.72 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>{m.albumLocked}</p>
      </div>
    </div>
  );
}
