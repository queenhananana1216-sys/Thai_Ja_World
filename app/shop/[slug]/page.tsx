import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAdminActorEmail } from '@/lib/admin/adminAllowedEmails';
import { createServerClient } from '@/lib/supabase/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import ShopMinihomeClient, { type ShopSpotPayload } from './ShopMinihomeClient';

const SELECT =
  'id,slug,name,description,line_url,photo_urls,owner_profile_id,minihome_public_slug,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra,is_published,minihome_guestbook_enabled';

async function loadSpot(slug: string): Promise<ShopSpotPayload | null> {
  const sb = createServerClient();
  const { data, error } = await sb
    .from('local_spots')
    .select(SELECT)
    .or(`minihome_public_slug.eq.${slug},slug.eq.${slug}`)
    .maybeSingle();
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

  // 비공개 가게 미니홈은 오너/관리자만 접근 가능하게 제한합니다.
  if (!spot.is_published) {
    const sb = await createServerSupabaseAuthClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    const viewerId = user?.id ?? null;
    const viewerEmail = user?.email ?? null;
    const canPreview =
      (viewerId !== null && spot.owner_profile_id === viewerId) || isAdminActorEmail(viewerEmail);
    if (!canPreview) notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-12 text-slate-200">
      <div className="mx-auto max-w-[1320px] px-4 pt-8">
        <div className="mb-5 rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.42)] backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="font-semibold text-violet-200 no-underline hover:underline">
              ← 홈
            </Link>
            <span className="text-slate-400">|</span>
            <Link href="/local" className="font-semibold text-violet-200 no-underline hover:underline">
              로컬 가게 목록
            </Link>
            <Link
              href="/ads"
              className="ml-auto rounded-full border border-violet-300/50 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200 no-underline transition hover:bg-violet-500/25"
            >
              우리 가게 광고 문의
            </Link>
          </div>
        </div>
      </div>
      <ShopMinihomeClient spot={spot} />
    </div>
  );
}
