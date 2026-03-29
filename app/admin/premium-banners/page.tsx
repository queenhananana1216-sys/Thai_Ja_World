/**
 * /admin/premium-banners — 상단·홈 스트립 등 프리미엄 배너 CRUD
 */

import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import PremiumBannersClient, { type PremiumBannerRow } from './_components/PremiumBannersClient';

export default async function AdminPremiumBannersPage() {
  let rows: PremiumBannerRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('premium_banners')
      .select('*')
      .order('slot', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) err = error.message;
    else rows = (data ?? []) as PremiumBannerRow[];
  } catch (e) {
    err = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="admin-page">
      <p style={{ margin: '0 0 8px' }}>
        <Link href="/admin" style={{ color: '#7c3aed', fontSize: 13 }}>
          ← 관리자 개요
        </Link>
      </p>
      <h1 className="admin-dash__title">프리미엄 배너</h1>
      <p className="admin-dash__lead">
        <code>top_bar</code> 슬롯은 전역 레이아웃에서 네비 바로 아래에 표시됩니다. 기간·활성 여부는 RLS로 공개
        조회에 반영됩니다. 테이블: <code>public.premium_banners</code>
      </p>

      {err && (
        <div className="admin-dash__alert">
          {err.includes('premium_banners') || err.includes('schema cache')
            ? `${err} — Supabase에 마이그레이션 044_premium_banners.sql 적용 여부를 확인하세요.`
            : err}
        </div>
      )}

      <PremiumBannersClient rows={rows} />
    </main>
  );
}
