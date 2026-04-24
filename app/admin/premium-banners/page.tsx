/**
 * /admin/premium-banners — Philgo 스타일 3열 레이아웃·윙 배너를 포함한 배너 CRUD.
 *
 * 위치(placement) / 노출 범위(route_group) / 이미지 크기(CLS 방지) 까지 한 화면에서 관리.
 */

import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import PremiumBannersClient, {
  type PremiumBannerRow,
} from './_components/PremiumBannersClient';

// 관리자 트리는 admin/layout.tsx 에서 force-dynamic 을 상속받음.

export default async function AdminPremiumBannersPage() {
  let rows: PremiumBannerRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('premium_banners')
      .select(
        'id, slot, placement, route_group, title, subtitle, image_url, image_width, image_height, href, badge_text, sponsor_label, sort_order, is_active, starts_at, ends_at, extra',
      )
      .order('placement', { ascending: true, nullsFirst: false })
      .order('route_group', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) err = error.message;
    else rows = (data ?? []) as PremiumBannerRow[];
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  const missingColumn =
    err?.includes('placement') ||
    err?.includes('route_group') ||
    err?.includes('image_width') ||
    err?.includes('sponsor_label');

  return (
    <main className="admin-page">
      <p style={{ margin: '0 0 8px' }}>
        <Link href="/admin" style={{ color: '#7c3aed', fontSize: 13 }}>
          ← 관리자 개요
        </Link>
      </p>
      <h1 className="admin-dash__title">프리미엄 배너</h1>
      <p className="admin-dash__lead">
        커뮤니티 좌/우 윙(<code>wing_left</code>·<code>wing_right</code>), 상단 바(<code>top_bar</code>),
        홈 스트립(<code>home_strip</code>) 을 한 화면에서 관리합니다. 기간·활성 여부는 RLS 로 공개 조회에
        반영됩니다. 테이블: <code>public.premium_banners</code>
      </p>

      {err && (
        <div className="admin-dash__alert">
          {missingColumn
            ? `${err} — Supabase 에 마이그레이션 098_premium_banners_placement.sql 을 적용하세요.`
            : err.includes('premium_banners') || err.includes('schema cache')
            ? `${err} — Supabase 에 044_premium_banners.sql + 098_premium_banners_placement.sql 을 모두 적용하세요.`
            : err}
        </div>
      )}

      <PremiumBannersClient rows={rows} />
    </main>
  );
}
