import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import LocalMinihomeMenuEditorClient from '../../../_components/LocalMinihomeMenuEditorClient';
import type { LocalMenuRow } from '../../../_components/LocalDigitalMenuClient';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

type PageProps = { params: Promise<{ slug: string }> };

async function fetchSpotBySlug(raw: string) {
  const slug = raw.trim();
  if (!slug) return null;
  const sb = createServerClient();
  const { data: bySlug, error: e1 } = await sb
    .from('local_spots')
    .select('id,slug,name,owner_profile_id,minihome_public_slug')
    .eq('slug', slug)
    .maybeSingle();
  if (!e1 && bySlug) return bySlug;
  const { data: byPublic, error: e2 } = await sb
    .from('local_spots')
    .select('id,slug,name,owner_profile_id,minihome_public_slug')
    .eq('minihome_public_slug', slug)
    .maybeSingle();
  if (!e2 && byPublic) return byPublic;
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const spot = await fetchSpotBySlug(slug);
  if (!spot) {
    return { title: '미니홈 편집', robots: { index: false, follow: false } };
  }
  const name = typeof spot.name === 'string' ? spot.name : slug;
  const desc = trimForMetaDescription(`${name} — 메뉴·가격·시술 텍스트 편집`);
  return {
    title: `${name} · 미니홈 텍스트 편집`,
    description: desc,
    robots: { index: false, follow: false },
  };
}

export default async function LocalMinihomeEditPage({ params }: PageProps) {
  const { slug } = await params;
  const trimmed = (slug || '').trim();
  if (!trimmed) notFound();

  const spot = await fetchSpotBySlug(trimmed);
  if (!spot) notFound();

  const auth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/local/${trimmed}/minihome/edit`)}`);
  }
  if (spot.owner_profile_id !== user.id) {
    notFound();
  }

  const sb = createServerClient();
  const { data: menus } = await sb
    .from('local_menus')
    .select('*')
    .eq('local_spot_id', spot.id)
    .order('list_section', { ascending: true })
    .order('sort_order', { ascending: true });

  const pathSlug = String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? trimmed).trim();
  const minihomeUrl = absoluteUrl(`/local/${encodeURIComponent(pathSlug)}/minihome`);

  return (
    <LocalMinihomeMenuEditorClient
      spot={{
        id: spot.id,
        slug: pathSlug,
        name: typeof spot.name === 'string' ? spot.name : null,
      }}
      initialMenus={(menus ?? []) as LocalMenuRow[]}
      minihomeUrl={minihomeUrl}
    />
  );
}
