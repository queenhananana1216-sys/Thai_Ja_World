import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocalDigitalMenuClient, { type LocalMenuRow } from '../../_components/LocalDigitalMenuClient';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function fetchSpotBySlug(raw: string) {
  const slug = raw.trim();
  if (!slug) return null;
  const sb = createServerClient();
  const { data: bySlug, error: e1 } = await sb
    .from('local_spots')
    .select(
      'id,slug,name,description,owner_profile_id,minihome_theme,minihome_menu,minihome_bgm_url,minihome_intro,is_published,minihome_public_slug',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (!e1 && bySlug) return bySlug;
  const { data: byPublic, error: e2 } = await sb
    .from('local_spots')
    .select(
      'id,slug,name,description,owner_profile_id,minihome_theme,minihome_menu,minihome_bgm_url,minihome_intro,is_published,minihome_public_slug',
    )
    .eq('minihome_public_slug', slug)
    .maybeSingle();
  if (!e2 && byPublic) return byPublic;
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const spot = await fetchSpotBySlug(slug);
  if (!spot) {
    return { title: '로컬 메뉴', robots: { index: false, follow: true } };
  }
  const name = typeof spot.name === 'string' ? spot.name : slug;
  const desc = trimForMetaDescription(
    typeof spot.description === 'string' && spot.description.trim()
      ? spot.description
      : `${name} 디지털 메뉴판 · 태자월드`,
  );
  const pathSlug = String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? slug).trim();
  const url = absoluteUrl(`/local/${encodeURIComponent(pathSlug)}/minihome`);
  return {
    title: `${name} · 메뉴`,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: `${name} · 메뉴`, description: desc, url, type: 'website' },
    robots: { index: Boolean(spot.is_published), follow: true },
  };
}

export default async function LocalDigitalMenuPage({ params }: PageProps) {
  const { slug } = await params;
  const trimmed = (slug || '').trim();
  if (!trimmed) notFound();

  const spot = await fetchSpotBySlug(trimmed);
  if (!spot) notFound();

  const authSb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await authSb.auth.getUser();
  const isOwner = Boolean(user?.id && spot.owner_profile_id && user.id === spot.owner_profile_id);

  if (!spot.is_published && !isOwner) notFound();

  const supabase = createServerClient();
  const { data: menus } = await supabase
    .from('local_menus')
    .select('*')
    .eq('local_spot_id', spot.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const pathSlug = String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? trimmed).trim();
  const canonicalMenuUrl = absoluteUrl(`/local/${encodeURIComponent(pathSlug)}/minihome`);

  return (
    <LocalDigitalMenuClient
      spot={{
        id: spot.id,
        slug: pathSlug,
        name: spot.name,
        description: spot.description,
        owner_profile_id: spot.owner_profile_id,
        minihome_theme: spot.minihome_theme,
        minihome_menu: spot.minihome_menu,
        minihome_bgm_url: spot.minihome_bgm_url ?? null,
        minihome_intro: spot.minihome_intro ?? null,
        is_published: spot.is_published,
      }}
      menus={(menus ?? []) as LocalMenuRow[]}
      canonicalMenuUrl={canonicalMenuUrl}
      isOwner={isOwner}
      viewerId={user?.id ?? null}
    />
  );
}
