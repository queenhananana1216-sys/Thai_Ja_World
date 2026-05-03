import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LocalDigitalMenuClient, { type LocalMenuRow } from '../../_components/LocalDigitalMenuClient';
import LocalMinihomeSafeFallback from '../../_components/LocalMinihomeSafeFallback';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

type PageProps = {
  params: Promise<{ slug: string }>;
};

function readPromptpayTarget(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = (raw as Record<string, unknown>).promptpay_target;
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null;
}

async function fetchSpotBySlug(raw: string) {
  const slug = raw.trim();
  if (!slug) return null;
  try {
    const sb = createServerClient();
    const { data: bySlug, error: e1 } = await sb
      .from('local_spots')
      .select(
        'id,slug,name,description,owner_profile_id,minihome_theme,minihome_menu,minihome_bgm_url,minihome_intro,minihome_extra,is_published,minihome_public_slug',
      )
      .eq('slug', slug)
      .maybeSingle();
    if (!e1 && bySlug) return bySlug;
    const { data: byPublic, error: e2 } = await sb
      .from('local_spots')
      .select(
        'id,slug,name,description,owner_profile_id,minihome_theme,minihome_menu,minihome_bgm_url,minihome_intro,minihome_extra,is_published,minihome_public_slug',
      )
      .eq('minihome_public_slug', slug)
      .maybeSingle();
    if (!e2 && byPublic) return byPublic;
  } catch (e) {
    console.error('[local/minihome] fetchSpotBySlug failed', e);
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const spot = await fetchSpotBySlug(slug);
    if (!spot) {
      return { title: '로컬 메뉴', robots: { index: false, follow: true } };
    }
    const name = typeof spot.name === 'string' ? spot.name : slug;
    const desc = trimForMetaDescription(
      typeof spot.description === 'string' && spot.description.trim()
        ? spot.description
        : `${name} 디지털 메뉴판 · 태국에, 살자`,
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
  } catch {
    return { title: '로컬 메뉴', robots: { index: false, follow: true } };
  }
}

async function LocalMinihomePageInner({ params }: PageProps) {
  const { slug } = await params;
  const trimmed = (slug || '').trim();
  if (!trimmed) notFound();

  const spot = await fetchSpotBySlug(trimmed);
  if (!spot) notFound();

  let userId: string | null = null;
  try {
    const authSb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await authSb.auth.getUser();
    userId = user?.id ?? null;
  } catch (e) {
    console.warn('[local/minihome] auth.getUser failed', e);
  }

  const isOwner = Boolean(userId && spot.owner_profile_id && userId === spot.owner_profile_id);

  if (!spot.is_published && !isOwner) notFound();

  let menus: LocalMenuRow[] = [];
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('local_menus')
      .select('*')
      .eq('local_spot_id', spot.id)
      .order('list_section', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (!error && data) menus = data as LocalMenuRow[];
    else if (error) console.warn('[local/minihome] local_menus select', error.message);
  } catch (e) {
    console.warn('[local/minihome] local_menus fetch exception', e);
  }

  const pathSlug = String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? trimmed).trim();
  const canonicalMenuUrl = absoluteUrl(`/local/${encodeURIComponent(pathSlug)}/minihome`);

  const envPrompt = process.env.NEXT_PUBLIC_PROMPTPAY_DEFAULT_TARGET?.trim() || null;

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
      menus={menus}
      canonicalMenuUrl={canonicalMenuUrl}
      isOwner={isOwner}
      viewerId={userId}
      tableOrderConfig={{
        promptpayTarget: readPromptpayTarget(spot.minihome_extra) ?? envPrompt,
      }}
    />
  );
}

export default async function LocalDigitalMenuPage(props: PageProps) {
  try {
    return await LocalMinihomePageInner(props);
  } catch (err) {
    console.error('[local/minihome] unhandled render error', err);
    let slug = '';
    try {
      const p = await props.params;
      slug = (p.slug || '').trim();
    } catch {
      slug = '';
    }
    if (!slug) notFound();
    return <LocalMinihomeSafeFallback slug={slug} />;
  }
}
