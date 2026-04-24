import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  AdminSafetyContactsClient,
  type SafetyRow,
} from './_components/AdminSafetyContactsClient';

export default async function AdminSafetyContactsPage() {
  let rows: SafetyRow[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('community_safety_contacts')
      .select(
        'id, kind, label_ko, label_th, value, value_kind, source_url, source_note, href, display_order, is_active, updated_at',
      )
      .order('display_order', { ascending: true });
    if (error) err = error.message;
    else rows = (data ?? []) as SafetyRow[];
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
      <h1 className="admin-dash__title">긴급 연락·제보(공개)</h1>
      <p className="admin-dash__lead" style={{ marginTop: 8 }}>
        <code>community_safety_contacts</code> — 랜딩·/help/emergency에 노출. 번호는{' '}
        <strong>외교부·0404·현지</strong> 공개 안내를 수시 확인하고 갱신하세요. (
        <a href="/help/emergency" target="_blank" rel="noreferrer">
          공개 페이지
        </a>
        )
      </p>
      {err && err.includes('relation') ? (
        <p className="admin-form-error">
          DB에 테이블이 없습니다. 마이그레이션 <code>100_public_safety_contacts.sql</code>을 적용하세요.
        </p>
      ) : null}
      <AdminSafetyContactsClient initialRows={rows} />
    </main>
  );
}
