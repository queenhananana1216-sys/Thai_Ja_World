/**
 * /admin/users — 회원 디렉터리 (초성·표시명 검색, 신고 건수 정렬)
 *
 * DB: migrations/006_profiles_admin_search_reports.sql 적용 필요.
 * 첫 스태프 지정: Supabase SQL 로
 *   update public.profiles set is_staff = true where id = '<uuid>';
 */
import Link from 'next/link';
import { formatLastSeenAdmin } from '@/lib/admin/formatLastSeen';
import { queryUserDirectory } from '@/lib/admin/userDirectoryQuery';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstString(v: string | string[] | undefined): string | undefined {
  if (typeof v === 'string') return v || undefined;
  if (Array.isArray(v)) return v[0] || undefined;
  return undefined;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = firstString(params.q) ?? '';
  const sortRaw = firstString(params.sort);
  const sort: 'reports' | 'created' | 'last_seen' =
    sortRaw === 'created' ? 'created' : sortRaw === 'last_seen' ? 'last_seen' : 'reports';

  let rows: Awaited<ReturnType<typeof queryUserDirectory>> = [];
  let errMsg: string | null = null;

  try {
    rows = await queryUserDirectory({ q, sort, limit: 200 });
  } catch (e) {
    errMsg = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ padding: '20px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>이용자 디렉터리</h1>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>
          표시명·초성 검색 · 신고 합산 · 마지막 접속(하트비트, 약 2분 간격)
        </span>
      </div>

      <form
        method="get"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
          marginBottom: '18px',
        }}
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="이름, 초성(ㄱㄴㄷ), 영문 일부…"
          style={{
            flex: '1 1 220px',
            minWidth: '200px',
            padding: '8px 10px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        />
        <select
          name="sort"
          defaultValue={sort}
          style={{ padding: '8px 10px', borderRadius: '6px', fontSize: '13px' }}
        >
          <option value="reports">신고 많은 순</option>
          <option value="created">가입 최신 순</option>
          <option value="last_seen">최근 접속 순</option>
        </select>
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            background: '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          검색
        </button>
        <Link href="/admin/users" style={{ fontSize: '12px', color: '#6366f1' }}>
          초기화
        </Link>
      </form>

      {errMsg && (
        <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '12px' }}>
          {errMsg}
          <br />
            <span style={{ color: '#6b7280' }}>
            Supabase에 006·010 마이그레이션 적용 여부·SUPABASE_SERVICE_ROLE_KEY·RPC 권한을 확인하세요.
          </span>
        </p>
      )}

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>표시명</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>초성·검색키</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>신고 합계</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>프로필/글/댓글</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>스트라이크</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>벤</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>스태프</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>접속 추정</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>마지막 접속</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>가입</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const hot = Number(r.reports_total) >= 5;
              const seen = formatLastSeenAdmin(r.last_seen_at);
              return (
                <tr
                  key={r.profile_id}
                  style={{
                    background: hot ? '#fff7ed' : undefined,
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: hot ? 700 : 500 }}>
                    {r.display_name ?? '—'}
                    {hot && (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          color: '#c2410c',
                          fontWeight: 700,
                        }}
                      >
                        신고다수
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      color: '#6b7280',
                      maxWidth: '200px',
                      wordBreak: 'break-all',
                    }}
                    title={r.admin_search}
                  >
                    {(r.admin_search || '—').slice(0, 48)}
                    {(r.admin_search?.length ?? 0) > 48 ? '…' : ''}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.reports_total}</td>
                  <td style={{ padding: '10px 12px', color: '#4b5563' }}>
                    {r.reports_on_profile}/{r.reports_on_posts}/{r.reports_on_comments}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.moderation_strikes}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.banned_until
                      ? new Date(r.banned_until).toLocaleDateString('ko-KR')
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.is_staff ? '✓' : ''}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {seen.likelyOnline ? (
                      <span style={{ color: '#059669', fontWeight: 700 }}>● 활동 중 추정</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>○</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#4b5563' }} title={r.last_seen_at ?? ''}>
                    {seen.relative}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('ko-KR') : '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'monospace',
                      fontSize: '10px',
                      color: '#9ca3af',
                    }}
                  >
                    {r.profile_id.slice(0, 8)}…
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: '16px', fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>
        표시명을 바꾸면 DB 트리거가 <code>admin_search</code>(초성+소문자)를 갱신합니다. 스태프 지정은 Supabase
        SQL에서만 가능합니다(일반 유저는 is_staff 변경 불가). <code>last_seen_at</code>은 로그인 세션의
        하트비트로만 갱신됩니다(진짜 온라인 여부와 다를 수 있음).
      </p>
    </main>
  );
}
