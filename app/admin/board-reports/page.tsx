import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export default async function AdminBoardReportsPage() {
  let rows: { id: string; title: string; created_at: string }[] = [];
  let err: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('board_posts')
      .select('id, title, created_at')
      .eq('board_type', 'reports')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) err = error.message;
    else
      rows = (data ?? []).map((r) => ({
        id: r.id as string,
        title: String(r.title ?? ''),
        created_at: String(r.created_at ?? ''),
      }));
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 12 }}>
        <h1 className="admin-dash__title" style={{ margin: 0 }}>
          검증 제보 게시판
        </h1>
        <Link
          href="/admin/board-reports/new"
          className="admin-design__seg-btn admin-design__seg-btn--on"
          style={{ textDecoration: 'none', fontSize: 13 }}
        >
          + 새 글
        </Link>
      </div>
      <p className="admin-dash__lead">
        공개 게시판 <Link href="/boards?tab=reports">/boards?tab=reports</Link> 과 동일 데이터입니다. 삭제는 DB·상세 화면
        확장 전까지 서비스 롤 콘솔에서 처리해 주세요.
      </p>
      {err ? <div className="admin-dash__alert">{err}</div> : null}
      {rows.length === 0 && !err ? (
        <p className="admin-design__state">아직 검증 제보 글이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                padding: '10px 0',
                borderBottom: '1px solid rgba(148,163,184,0.2)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <Link href={`/boards/${r.id}`} style={{ fontWeight: 600, color: '#e2e8f0', flex: '1 1 200px' }}>
                {r.title || '(제목 없음)'}
              </Link>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(r.created_at).toLocaleString('ko-KR')}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
