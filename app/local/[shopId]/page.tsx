import { notFound } from 'next/navigation';
import ShopMinihomeClient, { type ShopSpotPayload } from '@/app/shop/[slug]/ShopMinihomeClient';
import { createServerClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{ shopId: string }>;
};

export default async function LocalBusinessMinihomePage({ params }: Props) {
  const { shopId } = await params;
  const slug = (shopId || '').trim();
  if (!slug) notFound();

  const sb = createServerClient();
  const { data: spot, error: spotErr } = await sb
    .from('local_spots')
    .select(
      'id,slug,name,description,line_url,photo_urls,owner_profile_id,minihome_public_slug,minihome_intro,minihome_theme,minihome_bgm_url,minihome_menu,minihome_layout_modules,minihome_extra,is_published,minihome_guestbook_enabled',
    )
    .or(`minihome_public_slug.eq.${slug},slug.eq.${slug}`)
    .maybeSingle();
  if (spotErr || !spot) notFound();

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1320px] px-4 pt-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-md">
          <p className="text-xs font-semibold tracking-wide text-violet-200">
            B2B LOCAL MINI-HOME
          </p>
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
