import Link from 'next/link';
import { notFound } from 'next/navigation';
import MinihomeRoomView from '../_components/MinihomeRoomView';
import { createServerClient } from '@/lib/supabase/server';
import type { MinihomePublicRow } from '@/types/minihome';

export default async function MinihomePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length < 4) notFound();

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('user_minihomes')
    .select(
      'owner_id, public_slug, title, tagline, intro_body, theme, layout_modules, is_public, visit_count_today, visit_count_total, visit_count_date, section_visibility',
    )
    .eq('public_slug', slug)
    .maybeSingle();

  if (error || !data || !data.is_public) notFound();

  const row = data as MinihomePublicRow;

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/minihome" style={{ fontSize: '0.85rem' }}>
          ← 내 미니홈
        </Link>
      </div>
      <MinihomeRoomView data={row} />
    </div>
  );
}
