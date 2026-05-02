import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShopMinihomeClient, { type ShopSpotPayload } from '../../shop/[slug]/ShopMinihomeClient';
import { createServerClient } from '@/lib/supabase/server';
import JsonLd from '@/lib/seo/JsonLd';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';
import { getLocale } from '@/i18n/get-locale';
import { getPerceivedViewCount } from '@/lib/utils';

/**
 * `/local/[category]` 와 `/local/[shopId]` 가 같은 깊이에 다른 동적 이름을 쓰면
 * Next.js 런타임에서 `You cannot use different slug names for the same dynamic path` 로 서버가 깨질 수 있음.
 * 단일 `[slug]` 로 통합: 먼저 로컬 스팟(미니홈) 매칭, 없으면 카테고리 허브.
 */

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
};

type LocalBusinessRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  region: string;
  description: string | null;
  is_recommended: boolean;
  updated_at: string;
};

type PostRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  view_count: number;
  comment_count: number;
};

const POST_CAT_ALIAS: Record<string, string> = {
  free: 'free',
  qna: 'qna',
  info: 'info',
  realestate: 'info',
  'real-estate': 'info',
  flea: 'flea',
  market: 'flea',
  job: 'job',
  jobs: 'job',
  restaurant: 'restaurant',
};

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function toBoardCategory(category: string): string | null {
  return POST_CAT_ALIAS[normalizeCategory(category)] ?? null;
}

async function fetchSpotBySlug(raw: string) {
  const slug = raw.trim();
  if (!slug) return null;
  const sb = createServerClient();
  const { data: bySlug, error: e1 } = await sb
    .from('local_spots')
    .select(
      'id,slug,name,description,line_url,photo_urls,owner_profile_id,minihome_public_slug,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra,is_published,minihome_guestbook_enabled',
    )
    .eq('slug', slug)
    .maybeSingle();
  if (!e1 && bySlug) return bySlug;
  const { data: byPublic, error: e2 } = await sb
    .from('local_spots')
    .select(
      'id,slug,name,description,line_url,photo_urls,owner_profile_id,minihome_public_slug,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra,is_published,minihome_guestbook_enabled',
    )
    .eq('minihome_public_slug', slug)
    .maybeSingle();
  if (!e2 && byPublic) return byPublic;
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const spot = await fetchSpotBySlug(slug);
  if (spot) {
    const name = typeof spot.name === 'string' ? spot.name : slug;
    const pathSlug =
      String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? slug).trim();
    const url = absoluteUrl(`/local/${encodeURIComponent(pathSlug)}`);
    const rawDesc =
      typeof spot.description === 'string' && spot.description.trim()
        ? spot.description
        : `${name} 로컬 스팟 미니홈 · 태자월드`;
    const description = trimForMetaDescription(rawDesc, 160);
    const photos = spot.photo_urls as unknown;
    const ogImage =
      Array.isArray(photos) && typeof photos[0] === 'string' ? (photos[0] as string) : undefined;
    return {
      title: `${name} | 로컬 미니홈`,
      description,
      keywords: [name, '태국 로컬', '방콕', '태자월드', '미니홈', 'B2B'],
      alternates: { canonical: url },
      openGraph: {
        title: `${name} | 로컬 미니홈`,
        description,
        url,
        type: 'website',
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
      twitter: {
        card: ogImage ? 'summary_large_image' : 'summary',
        title: `${name} | 로컬 미니홈`,
        description,
      },
      robots: { index: true, follow: true },
    };
  }
  const hubDesc = `${slug} 카테고리의 로컬 업체와 게시글을 한 화면에서 확인합니다.`;
  return {
    title: `${slug} | 로컬 인텔`,
    description: hubDesc,
    keywords: [slug, '로컬 인텔', '태국', '태자월드'],
    openGraph: {
      title: `${slug} | 로컬 인텔`,
      description: hubDesc,
      url: absoluteUrl(`/local/${encodeURIComponent(slug)}`),
      type: 'website',
    },
    robots: { index: true, follow: true },
  };
}

async function fetchLocalBusinesses(category: string): Promise<LocalBusinessRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('local_businesses')
    .select('id,slug,name,category,region,description,is_recommended,updated_at')
    .eq('is_active', true)
    .ilike('category', category)
    .order('is_recommended', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(80);
  return (data ?? []) as LocalBusinessRow[];
}

async function fetchCategoryPosts(category: string): Promise<PostRow[]> {
  const boardCategory = toBoardCategory(category);
  if (!boardCategory) return [];
  const supabase = createServerClient();
  const { data } = await supabase
    .from('posts')
    .select('id,title,category,created_at,view_count,comment_count')
    .eq('moderation_status', 'safe')
    .eq('author_hidden', false)
    .eq('is_knowledge_tip', false)
    .eq('category', boardCategory)
    .order('created_at', { ascending: false })
    .limit(80);
  return (data ?? []) as PostRow[];
}

async function renderMinihome(spot: NonNullable<Awaited<ReturnType<typeof fetchSpotBySlug>>>) {
  const sb = createServerClient();
  const { data: biz } = await sb
    .from('local_businesses')
    .select('owner_id,name,category,region,mini_home')
    .eq('owner_id', spot.owner_profile_id ?? '')
    .limit(1)
    .maybeSingle();

  const { data: minihome } = await sb
    .from('user_minihomes')
    .select('owner_id,title,tagline,theme')
    .eq('owner_id', spot.owner_profile_id ?? '')
    .maybeSingle();

  const payload: ShopSpotPayload = {
    ...(spot as ShopSpotPayload),
    minihome_intro:
      spot.minihome_intro ||
      [biz?.name ? `${biz.name} (${biz.category ?? 'LOCAL'})` : null, minihome?.tagline ?? null]
        .filter(Boolean)
        .join(' · '),
  };

  const slugForUrl =
    String(spot.slug ?? '').trim() || String(spot.minihome_public_slug ?? '').trim() || 'local';
  const pageUrl = absoluteUrl(`/local/${encodeURIComponent(slugForUrl)}`);
  const spotName = typeof spot.name === 'string' ? spot.name : slugForUrl;
  const descForLd = trimForMetaDescription(
    (typeof spot.description === 'string' && spot.description.trim()
      ? spot.description
      : payload.minihome_intro) ?? spotName,
    4000,
  );
  const photoUrls = Array.isArray(spot.photo_urls) ? (spot.photo_urls as string[]) : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: spotName,
          description: descForLd,
          url: pageUrl,
          ...(photoUrls[0] ? { image: photoUrls[0] } : {}),
          ...(biz?.category ? { knowsAbout: biz.category } : {}),
          ...(biz?.region
            ? {
                address: {
                  '@type': 'PostalAddress',
                  addressRegion: biz.region,
                },
              }
            : {}),
        }}
      />
      <div className="mx-auto max-w-[1320px] px-4 pt-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
          <p className="text-xs font-semibold tracking-wide text-violet-200">B2B LOCAL MINI-HOME</p>
          <p className="mt-1 truncate text-sm text-slate-300">
            {biz?.region ? `${biz.region} · ` : ''}
            {biz?.category ?? 'LOCAL'} · 광고주 QR 진입 쇼룸
          </p>
        </div>
      </div>
      <ShopMinihomeClient spot={payload} />
    </main>
  );
}

async function renderCategoryHub(normalizedCategory: string, view: string | undefined) {
  const locale = await getLocale();
  const numLocale = locale === 'th' ? 'th-TH' : 'ko-KR';
  const asGrid = view === 'grid';
  const [businesses, posts] = await Promise.all([
    fetchLocalBusinesses(normalizedCategory),
    fetchCategoryPosts(normalizedCategory),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1320px] px-2 py-2 sm:px-3">
      <section className="rounded-xl border border-white/10 bg-slate-900/70 p-2 shadow-[0_12px_34px_rgba(2,6,23,0.42)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-black tracking-tight text-slate-100 sm:text-base">
            {normalizedCategory} 카테고리
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/local/${encodeURIComponent(normalizedCategory)}?view=list`}
              className="rounded-md border border-slate-600/60 px-2 py-1 text-[11px] font-semibold text-slate-200 no-underline"
            >
              List
            </Link>
            <Link
              href={`/local/${encodeURIComponent(normalizedCategory)}?view=grid`}
              className="rounded-md border border-slate-600/60 px-2 py-1 text-[11px] font-semibold text-slate-200 no-underline"
            >
              Grid
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-2 rounded-xl border border-white/10 bg-slate-900/65 p-2">
        <h2 className="mb-1 text-xs font-extrabold text-amber-200">로컬 업체</h2>
        {businesses.length === 0 ? (
          <p className="text-xs text-slate-400">등록된 로컬 업체가 없습니다.</p>
        ) : (
          <div className={asGrid ? 'grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4' : 'flex flex-col gap-1'}>
            {businesses.map((biz) => (
              <Link
                key={biz.id}
                href={`/shop/${biz.slug}`}
                className="rounded-lg border border-white/10 bg-slate-800/70 p-2 no-underline transition hover:bg-slate-700/80"
              >
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{biz.name}</div>
                <div className="mt-0.5 text-[10px] text-slate-400 line-clamp-1">
                  {biz.category} · {biz.region}
                </div>
                {biz.description ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-300 line-clamp-2">{biz.description}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-2 rounded-xl border border-white/10 bg-slate-900/65 p-2">
        <h2 className="mb-1 text-xs font-extrabold text-cyan-200">게시글</h2>
        {posts.length === 0 ? (
          <p className="text-xs text-slate-400">연결된 게시글이 없습니다.</p>
        ) : (
          <div className={asGrid ? 'grid grid-cols-1 gap-1 sm:grid-cols-2' : 'flex flex-col gap-1'}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/boards/${post.id}`}
                className="rounded-lg border border-white/10 bg-slate-800/70 p-2 no-underline transition hover:bg-slate-700/80"
              >
                <div className="text-xs font-bold text-slate-100 line-clamp-1">{post.title}</div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  👀 {getPerceivedViewCount(Number(post.view_count ?? 0), post.id).toLocaleString(numLocale)} · 댓글{' '}
                  {post.comment_count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default async function LocalSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const trimmed = (slug || '').trim();
  if (!trimmed) notFound();

  const spot = await fetchSpotBySlug(trimmed);
  if (spot) {
    return renderMinihome(spot);
  }

  const { view } = await searchParams;
  const normalizedCategory = normalizeCategory(trimmed);
  return renderCategoryHub(normalizedCategory, view);
}
