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
      <h1 className="admin-dash__title">로컬 가게 · 맛집 · 마사지</h1>
      <p className="admin-dash__lead">
        시드로 들어온 초안은 <strong>비공개</strong> 상태입니다. «승인·공개»만 눌러도 사이트에 올라가니, 그다음 «수정»으로
        상호·주소·사진을 다듬으세요. 사진(URL 또는 업로드), LINE, <code>extra</code>(전화·지도 등), 오너 이메일·미니홈은
        기존과 동일합니다. 테이블: <code>public.local_spots</code> — 마이그레이션 <code>047</code>·<code>048</code>
        (카테고리 massage + 초안 시드).
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
