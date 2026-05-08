/**
 * GET — 최근 14일 `site_analytics` 기준 스폰서 배너 클릭·노출(CTR), 미니홈 페이지뷰 (관리자 전용).
 */
import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 14 * 86_400_000;
const FETCH_CAP = 28_000;

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = createServiceRoleClient();
  const sinceIso = new Date(Date.now() - WINDOW_MS).toISOString();

  const { data, error } = await admin
    .from('site_analytics')
    .select('kind,route,meta,recorded_at,session_id')
    .gte('recorded_at', sinceIso)
    .in('kind', ['view', 'click'])
    .order('recorded_at', { ascending: false })
    .limit(FETCH_CAP);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    kind: string;
    route: string | null;
    meta: unknown;
    session_id: string | null;
  };

  const bannerClicks: Record<string, number> = {};
  const bannerImpressions: Record<string, number> = {};
  let shopViews = 0;

  /** slug → 페이지뷰 수 (중복 세션 포함 — 영업 보조 지표) */
  const minihomeViewsBySlug: Record<string, number> = {};
  /** 미니홈 최소 한 번이라도 연 유저 세션 추정(unique session_id) */
  const minihomeSessions = new Set<string>();

  const recordClickBanner = (id: string) => {
    if (!id) return;
    bannerClicks[id] = (bannerClicks[id] ?? 0) + 1;
  };

  const recordImpressionBanner = (id: string) => {
    if (!id) return;
    bannerImpressions[id] = (bannerImpressions[id] ?? 0) + 1;
  };

  for (const raw of (data ?? []) as Row[]) {
    const meta =
      raw.meta !== null && typeof raw.meta === 'object' ? (raw.meta as Record<string, unknown>) : {};
    const route = typeof raw.route === 'string' ? raw.route : '';
    const sid = typeof raw.session_id === 'string' ? raw.session_id : '';

    if (raw.kind === 'click') {
      const bidRaw = meta.banner_id;
      if (typeof bidRaw === 'string' && bidRaw.trim()) recordClickBanner(bidRaw.trim());
    }

    if (raw.kind === 'view') {
      const impression = meta.banner_impression === true;
      const bidRaw = meta.banner_id;
      if (impression && typeof bidRaw === 'string' && bidRaw.trim()) {
        recordImpressionBanner(bidRaw.trim());
      }

      if (
        /^\/shop\/[^/]+$/.test(route) ||
        (route.startsWith('/shop/') && !route.includes('api'))
      ) {
        shopViews += 1;
      }

      const mv = /^\/minihome\/([^/?#]+)/i.exec(route);
      const cap = mv?.[1];
      if (cap) {
        const slug = decodeURIComponent(cap).trim().toLowerCase();
        if (slug) {
          minihomeViewsBySlug[slug] = (minihomeViewsBySlug[slug] ?? 0) + 1;
          if (sid) minihomeSessions.add(sid);
        }
      }
    }
  }

  const bannerIdSet = new Set<string>([
    ...Object.keys(bannerClicks),
    ...Object.keys(bannerImpressions),
  ]);

  const labels: Record<
    string,
    { title: string | null; placement: string | null; sponsor_label: string | null }
  > = {};

  const bannerIds = Array.from(bannerIdSet);
  if (bannerIds.length) {
    const { data: bans, error: bErr } = await admin
      .from('premium_banners')
      .select('id,title,placement,sponsor_label')
      .in('id', bannerIds);
    if (!bErr && Array.isArray(bans)) {
      for (const b of bans as {
        id?: string;
        title?: string | null;
        placement?: string | null;
        sponsor_label?: string | null;
      }[]) {
        if (!b?.id) continue;
        labels[b.id] = {
          title: typeof b.title === 'string' ? b.title : null,
          placement: typeof b.placement === 'string' ? b.placement : null,
          sponsor_label: typeof b.sponsor_label === 'string' ? b.sponsor_label : null,
        };
      }
    }
  }

  const rowsOut = bannerIds
    .map((id) => {
      const clicks = bannerClicks[id] ?? 0;
      const impressions = bannerImpressions[id] ?? 0;
      const ctr = impressions > 0 ? clicks / impressions : clicks > 0 ? null : null;
      return {
        banner_id: id,
        clicks,
        impressions,
        ctr,
        ...(labels[id] ?? { title: null, placement: null, sponsor_label: null }),
      };
    })
    .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0) || (b.impressions ?? 0) - (a.impressions ?? 0));

  const minihomeTopSlugs = Object.entries(minihomeViewsBySlug)
    .map(([slug, views]) => ({ slug, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const minihomePageViewsTotal = Object.values(minihomeViewsBySlug).reduce((a, v) => a + v, 0);

  return NextResponse.json({
    window_days: WINDOW_MS / 86_400_000,
    shop_page_views: shopViews,
    minihome_page_views_total: minihomePageViewsTotal,
    minihome_distinct_sessions_estimate: minihomeSessions.size,
    minihome_top_slugs: minihomeTopSlugs,
    banner_rows: rowsOut,
    note_ctr:
      'ctr = clicks / impressions. 노출은 `BannerCardWithTracking(trackImpression)`·퀵메뉴 스폰서 타일에서 세션당 1회 전송되는 view 이벤트 기준입니다.',
  });
}
