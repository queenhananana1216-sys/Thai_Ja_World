/**
 * /admin/local-spots — 태자월드 로컬 가게(맛집 등) CRUD
 */

import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import LocalSpotsClient, { type LocalSpotRow } from './_components/LocalSpotsClient';

export default async function AdminLocalSpotsPage() {
  let spots: LocalSpotRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('local_spots')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) err = error.message;
    else spots = (data ?? []) as LocalSpotRow[];
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
      <h1 className="admin-dash__title">로컬 가게 · 맛집</h1>
      <p className="admin-dash__lead">
        사진(URL 또는 업로드), 설명, LINE 링크를 넣고 공개하면 사용자용 API·화면에서 조회할 수 있습니다.{' '}
        <code>extra</code> JSON으로 전화·주소·지도 URL 등을 자유롭게 확장하세요. 오너 이메일·미니홈 슬러그는{' '}
        <code>/my-local-shop</code>·<code>/shop/슬러그</code>와 연결됩니다. 테이블: <code>public.local_spots</code>
      </p>

      {err && (
        <div className="admin-dash__alert">
          {err.includes('local_spots') || err.includes('schema cache')
            ? `${err} — Supabase에 마이그레이션 042_local_spots.sql 을 적용했는지 확인하세요.`
            : err}
        </div>
      )}

      <LocalSpotsClient spots={spots} />
    </main>
  );
}
