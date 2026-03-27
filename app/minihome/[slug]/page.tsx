import Link from 'next/link';
import { notFound } from 'next/navigation';
import MinihomeRoomView from '../_components/MinihomeRoomView';
import { createServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import type { MinihomePublicRow } from '@/types/minihome';

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
    .select('public_slug, title, tagline, intro_body, theme, layout_modules, is_public')
    .eq('public_slug', slug)
    .maybeSingle();

  if (error || !data || !data.is_public) notFound();

  const locale = await getLocale();
  const d = getDictionary(locale);
  const row = data as MinihomePublicRow;

  return (
    <div className="page-body board-page minihome-public-page">
      <div className="board-toolbar">
        <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          ← {d.nav.community}
        </Link>
      </div>
      <MinihomeRoomView
        data={row}
        labels={d.minihome}
        navCommunity={d.nav.community}
        variant="page"
      />
    </div>
  );
}
