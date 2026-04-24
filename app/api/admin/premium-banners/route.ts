/**
 * 프리미엄 배너 CRUD — 관리자 전용 (service role)
 *
 * 새 필드(placement / route_group / image_width / image_height / sponsor_label)는
 * 098 마이그레이션이 있어야 저장 가능. DB 가 오래돼 컬럼이 없으면 호환 모드로
 * 기존 `slot` 만 채우고 나머지는 생략한다 (운영 중단 방지).
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import {
  BANNER_PLACEMENTS,
  BANNER_ROUTE_GROUPS,
  type BannerPlacement,
  type BannerRouteGroup,
} from '@/lib/banners/types';

export const runtime = 'nodejs';

type Body = {
  action?: 'create' | 'update' | 'delete';
  id?: string;
  /** 신규: placement — 없으면 slot 으로 폴백 */
  placement?: string;
  /** 레거시: slot — 044 스키마에서만 존재 */
  slot?: string;
  route_group?: string;
  title?: string;
  subtitle?: string | null;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  href?: string | null;
  badge_text?: string | null;
  sponsor_label?: string | null;
  sort_order?: number;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  extra_json?: string | null;
};

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

function normalizeInt(v: unknown): number | null {
  if (typeof v !== 'number') return null;
  if (!Number.isFinite(v)) return null;
  const n = Math.floor(v);
  return n > 0 ? n : null;
}

export async function POST(req: Request) {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON 필요' }, { status: 400 });
  }

  const action = body.action;
  if (action !== 'create' && action !== 'update' && action !== 'delete') {
    return NextResponse.json({ error: 'action 은 create | update | delete' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    const { error } = await admin.from('premium_banners').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/premium-banners');
    return NextResponse.json({ ok: true });
  }

  const rawPlacement = typeof body.placement === 'string' ? body.placement : body.slot;
  const placement: BannerPlacement =
    typeof rawPlacement === 'string' &&
    (BANNER_PLACEMENTS as readonly string[]).includes(rawPlacement)
      ? (rawPlacement as BannerPlacement)
      : 'top_bar';

  const routeGroup: BannerRouteGroup =
    typeof body.route_group === 'string' &&
    (BANNER_ROUTE_GROUPS as readonly string[]).includes(body.route_group)
      ? (body.route_group as BannerRouteGroup)
      : 'all';

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const sort_order =
    typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)
      ? Math.floor(body.sort_order)
      : 0;
  const is_active = body.is_active !== false;
  const subtitle =
    body.subtitle === undefined || body.subtitle === null ? null : String(body.subtitle);
  const image_url =
    body.image_url === undefined || body.image_url === null
      ? null
      : String(body.image_url).trim() || null;
  const image_width = normalizeInt(body.image_width);
  const image_height = normalizeInt(body.image_height);
  const href =
    body.href === undefined || body.href === null ? null : String(body.href).trim() || null;
  const badge_text =
    body.badge_text === undefined || body.badge_text === null
      ? null
      : String(body.badge_text).trim() || null;
  const sponsor_label =
    body.sponsor_label === undefined || body.sponsor_label === null
      ? null
      : String(body.sponsor_label).trim() || null;
  const starts_at = body.starts_at?.trim() || null;
  const ends_at = body.ends_at?.trim() || null;

  let extra: Record<string, unknown> = {};
  const ej = body.extra_json?.trim();
  if (ej) {
    try {
      const o = JSON.parse(ej) as unknown;
      if (o && typeof o === 'object' && !Array.isArray(o)) extra = o as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'extra_json 파싱 실패' }, { status: 400 });
    }
  }

  const basePayload: Record<string, unknown> = {
    slot: placement,
    placement,
    route_group: routeGroup,
    title,
    subtitle,
    image_url,
    image_width,
    image_height,
    href,
    badge_text,
    sponsor_label,
    sort_order,
    is_active,
    starts_at,
    ends_at,
    extra,
  };

  async function insertWithFallback() {
    let { error } = await admin.from('premium_banners').insert(basePayload).select('id').single();
    if (!error) return { error: null, fallback: false };
    // 098 마이그레이션 미적용 시: 알 수 없는 컬럼 에러 → slot 만으로 재시도
    if (String(error.message).includes('column') || String(error.message).includes('does not exist')) {
      const legacy = {
        slot: placement,
        title,
        subtitle,
        image_url,
        href,
        badge_text,
        sort_order,
        is_active,
        starts_at,
        ends_at,
        extra,
      };
      const retry = await admin.from('premium_banners').insert(legacy).select('id').single();
      return { error: retry.error, fallback: true };
    }
    return { error, fallback: false };
  }

  async function updateWithFallback(id: string) {
    let { error } = await admin.from('premium_banners').update(basePayload).eq('id', id);
    if (!error) return { error: null, fallback: false };
    if (String(error.message).includes('column') || String(error.message).includes('does not exist')) {
      const legacy = {
        slot: placement,
        title,
        subtitle,
        image_url,
        href,
        badge_text,
        sort_order,
        is_active,
        starts_at,
        ends_at,
        extra,
      };
      const retry = await admin.from('premium_banners').update(legacy).eq('id', id);
      return { error: retry.error, fallback: true };
    }
    return { error, fallback: false };
  }

  if (action === 'create') {
    const { error, fallback } = await insertWithFallback();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath('/', 'layout');
    revalidatePath('/admin/premium-banners');
    return NextResponse.json({ ok: true, fallback });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id) return NextResponse.json({ error: 'update 시 id' }, { status: 400 });

  const { error, fallback } = await updateWithFallback(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath('/', 'layout');
  revalidatePath('/admin/premium-banners');
  return NextResponse.json({ ok: true, fallback });
}
