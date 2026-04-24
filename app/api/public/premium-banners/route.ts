import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BANNER_PLACEMENTS,
  BANNER_ROUTE_GROUPS,
  type BannerPlacement,
  type BannerRouteGroup,
} from '@/lib/banners/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 공개 배너 조회.
 * 구버전: ?slot=top_bar   (044 스키마)
 * 신버전: ?placement=wing_left&route_group=community (098 스키마)
 *
 * 실패·env 누락·RLS 차단 어떤 경우에도 `{ banners: [] }` + 200 을 돌려준다.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawPlacement = searchParams.get('placement')?.trim();
  const rawSlot = searchParams.get('slot')?.trim();
  const rawRoute = searchParams.get('route_group')?.trim() || 'all';

  const placement =
    rawPlacement && (BANNER_PLACEMENTS as readonly string[]).includes(rawPlacement)
      ? (rawPlacement as BannerPlacement)
      : rawSlot && (BANNER_PLACEMENTS as readonly string[]).includes(rawSlot)
      ? (rawSlot as BannerPlacement)
      : 'top_bar';

  const routeGroup: BannerRouteGroup = (BANNER_ROUTE_GROUPS as readonly string[]).includes(rawRoute)
    ? (rawRoute as BannerRouteGroup)
    : 'all';

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) {
    return NextResponse.json({ banners: [], degraded: true });
  }

  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // 'all' 은 항상 포함되도록 OR 조건을 프런트가 읽기 좋게 2회 쿼리 없이 in() 로 처리.
    const rgValues = Array.from(new Set<BannerRouteGroup>(['all', routeGroup]));
    const { data, error } = await sb
      .from('premium_banners')
      .select(
        'id, slot, placement, route_group, title, subtitle, image_url, image_width, image_height, href, badge_text, sponsor_label, sort_order, extra',
      )
      .in('route_group', rgValues as string[])
      .or(`placement.eq.${placement},and(placement.is.null,slot.eq.${placement})`)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message, banners: [], degraded: true });
    }
    return NextResponse.json({ banners: data ?? [] });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      banners: [],
      degraded: true,
    });
  }
}
