import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import ShopMinihomeClient, { type ShopSpotPayload } from './ShopMinihomeClient';

const SELECT =
  'id,name,description,line_url,photo_urls,minihome_public_slug,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra,is_published';

async function loadSpot(slug: string): Promise<ShopSpotPayload | null> {
  const sb = await createServerSupabaseAuthClient();
  const { data, error } = await sb.from('local_spots').select(SELECT).eq('minihome_public_slug', slug).maybeSingle();
  if (error || !data) return null;
  return data as ShopSpotPayload;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await loadSpot(slug);
  if (!row) return { title: '가게 미니홈' };
  return { title: `${row.name} — 로컬 미니홈` };
}

export default async function ShopMinihomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length < 4) notFound();

  const spot = await loadSpot(slug);
  if (!spot) notFound();

  return (
    <div className="page-body" style={{ padding: '0 0 48px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--tj-link, #7c3aed)' }}>
          ← 홈
        </Link>
        <span style={{ margin: '0 8px', color: 'var(--tj-muted, #94a3b8)' }}>|</span>
        <Link href="/local" style={{ fontSize: 13, color: 'var(--tj-link, #7c3aed)' }}>
          로컬 가게 목록
        </Link>
      </div>
      <ShopMinihomeClient spot={spot} />
    </div>
  );
}
