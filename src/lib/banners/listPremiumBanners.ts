import 'server-only';

import { createClient } from '@supabase/supabase-js';
import {
  BANNER_PLACEMENTS,
  BANNER_ROUTE_GROUPS,
  type BannerPlacement,
  type BannerRouteGroup,
  type PublicBanner,
} from '@/lib/banners/types';

type Row = {
  id: string;
  slot: string | null;
  placement: string | null;
  route_group: string | null;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  href: string | null;
  badge_text: string | null;
  sponsor_label: string | null;
  sort_order: number | null;
  extra: unknown;
};

function normalizePlacement(row: Row): BannerPlacement | null {
  const cand = row.placement ?? row.slot ?? '';
  return (BANNER_PLACEMENTS as readonly string[]).includes(cand)
    ? (cand as BannerPlacement)
    : null;
}

function normalizeRouteGroup(v: string | null | undefined): BannerRouteGroup {
  if (v && (BANNER_ROUTE_GROUPS as readonly string[]).includes(v)) {
    return v as BannerRouteGroup;
  }
  return 'all';
}

function toExtra(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function rowToPublic(row: Row): PublicBanner | null {
  const placement = normalizePlacement(row);
  if (!placement) return null;
  return {
    id: row.id,
    placement,
    routeGroup: normalizeRouteGroup(row.route_group),
    title: (row.title ?? '').trim(),
    subtitle: row.subtitle?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    imageWidth:
      typeof row.image_width === 'number' && Number.isFinite(row.image_width) ? row.image_width : null,
    imageHeight:
      typeof row.image_height === 'number' && Number.isFinite(row.image_height)
        ? row.image_height
        : null,
    href: row.href?.trim() || null,
    badgeText: row.badge_text?.trim() || null,
    sponsorLabel: row.sponsor_label?.trim() || null,
    sortOrder: typeof row.sort_order === 'number' ? row.sort_order : 0,
    extra: toExtra(row.extra),
  };
}

export type ListBannersOptions = {
  /** 한 번에 여러 슬롯을 가져와 페이지 렌더를 한 번의 쿼리로 끝냄 */
  placements: BannerPlacement[];
  /** 'all' 은 항상 포함됨 (컴포넌트에서 덮어쓰기) */
  routeGroups: BannerRouteGroup[];
  /** 슬롯별 최대 노출 개수 (기본 8). 너무 많으면 레이아웃이 늘어진다. */
  limitPerPlacement?: number;
};

/**
 * 서버 전용 프리미엄 배너 리졸버.
 * 실패·env 누락·RLS 차단 시 반드시 [] 를 돌려줘 레이아웃이 깨지지 않게 한다.
 */
export async function listPremiumBanners({
  placements,
  routeGroups,
  limitPerPlacement = 8,
}: ListBannersOptions): Promise<Record<BannerPlacement, PublicBanner[]>> {
  const empty: Record<BannerPlacement, PublicBanner[]> = {
    top_bar: [],
    home_strip: [],
    wing_left: [],
    wing_right: [],
    header_side: [],
    in_content: [],
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url?.trim() || !key?.trim()) return empty;

  if (placements.length === 0) return empty;

  const rgSet = new Set<BannerRouteGroup>(['all', ...routeGroups]);

  try {
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb
      .from('premium_banners')
      .select(
        'id, slot, placement, route_group, title, subtitle, image_url, image_width, image_height, href, badge_text, sponsor_label, sort_order, extra',
      )
      .in('placement', placements as string[])
      .in('route_group', Array.from(rgSet) as string[])
      .order('sort_order', { ascending: true });

    if (error || !Array.isArray(data)) return empty;

    const byPlacement: Record<BannerPlacement, PublicBanner[]> = { ...empty };
    for (const raw of data as Row[]) {
      const pub = rowToPublic(raw);
      if (!pub) continue;
      if (!placements.includes(pub.placement)) continue;
      const bucket = byPlacement[pub.placement];
      if (bucket.length >= limitPerPlacement) continue;
      bucket.push(pub);
    }
    return byPlacement;
  } catch {
    return empty;
  }
}
