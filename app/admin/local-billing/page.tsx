/**
 * /admin/local-billing — B2B 영업용: 테이블 QR 발급 · Stripe 체험 링크 · 구독 상태
 */

import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { absoluteUrl } from '@/lib/seo/site';
import LocalBillingSalesClient, { type BillingSpotRow } from './_components/LocalBillingSalesClient';

function menuPathSlug(row: { slug: string; minihome_public_slug: string | null }): string {
  return String(row.slug ?? '').trim() || String(row.minihome_public_slug ?? '').trim();
}

export default async function AdminLocalBillingPage() {
  let spots: BillingSpotRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('local_spots')
      .select(
        'id, name, slug, minihome_public_slug, owner_profile_id, stripe_customer_id, subscription_status, trial_ends_at',
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) err = error.message;
    else {
      spots = (data ?? []).map((raw) => {
        const row = raw as Record<string, unknown>;
        const slug = typeof row.slug === 'string' ? row.slug : '';
        const minihome_public_slug =
          typeof row.minihome_public_slug === 'string' ? row.minihome_public_slug : null;
        const path = menuPathSlug({ slug, minihome_public_slug });
        return {
          id: String(row.id),
          name: typeof row.name === 'string' ? row.name : '이름 없음',
          slug,
          minihome_public_slug,
          owner_profile_id: typeof row.owner_profile_id === 'string' ? row.owner_profile_id : null,
          menuAbsoluteUrl: absoluteUrl(`/local/${encodeURIComponent(path)}/minihome`),
          stripe_customer_id: typeof row.stripe_customer_id === 'string' ? row.stripe_customer_id : null,
          subscription_status: typeof row.subscription_status === 'string' ? row.subscription_status : null,
          trial_ends_at: typeof row.trial_ends_at === 'string' ? row.trial_ends_at : null,
        };
      });
    }
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
      <h1 className="admin-dash__title">B2B 영업 &amp; QR 발급</h1>
      <p className="admin-dash__lead">
        오프라인 매장 방문 영업 시 <strong>테이블 스티커 QR</strong> 출력·전달,{' '}
        <strong>Stripe 1개월 무료 체험</strong> 결제 링크 공유,{' '}
        <strong>구독·트라이얼 상태</strong>를 한 화면에서 처리합니다. Stripe 환경변수{' '}
        <code>STRIPE_B2B_SUBSCRIPTION_PRICE_ID</code> 가 설정되어 있어야 링크 생성이 됩니다.
      </p>

      {err ? <div className="admin-dash__alert">{err}</div> : null}

      <LocalBillingSalesClient spots={spots} />
    </main>
  );
}
