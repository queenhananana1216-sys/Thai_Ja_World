import Link from 'next/link';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export default async function AdminDashboardPage() {
  const fiveAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let totalUsers = 0;
  let recentActive = 0;
  let draftNews: number | null = null;
  let dbNote: string | null = null;

  try {
    const admin = createServiceRoleClient();
    const { count: c1 } = await admin.from('profiles').select('*', { count: 'exact', head: true });
    totalUsers = c1 ?? 0;

    const { count: c2, error: e2 } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen_at', fiveAgo);
    if (e2) {
      dbNote = `last_seen_at 집계 불가(010 마이그레이션 미적용?): ${e2.message}`;
    } else {
      recentActive = c2 ?? 0;
    }

    const { count: c3, error: e3 } = await admin
      .from('processed_news')
      .select('*', { count: 'exact', head: true })
      .eq('published', false);
    if (e3) {
      if (!dbNote) dbNote = `뉴스 초안 집계 생략: ${e3.message}`;
    } else {
      draftNews = c3 ?? 0;
    }
  } catch (e) {
    dbNote = e instanceof Error ? e.message : String(e);
  }

  return (
    <main style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>관리자 개요</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.55 }}>
        1차 출시·도메인 연결 후에도 여기서 이용자·봇·뉴스 초안을 한눈에 볼 수 있어요. 친구·가게 채팅 등은
        이후 확장만 염두에 두고, 지금은 지표 중심입니다.
      </p>

      {dbNote && (
        <p style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: 10, borderRadius: 8, fontSize: 12 }}>
          {dbNote}
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          marginTop: 16,
        }}
      >
        <StatCard title="가입 프로필 수" value={String(totalUsers)} hint="auth.users 1:1 profiles" />
        <StatCard
          title="최근 5분 활동(추정)"
          value={String(recentActive)}
          hint="last_seen_at 하트비트 · 010 마이그레이션 필요"
        />
        <StatCard
          title="뉴스 초안(미게시)"
          value={draftNews === null ? '—' : String(draftNews)}
          hint="NEWS_PUBLISH_MODE=manual"
        />
      </div>

      <ul style={{ marginTop: 28, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: '#374151' }}>
        <li>
          <Link href="/admin/users" style={{ color: '#4f46e5' }}>
            이용자 디렉터리
          </Link>
          — 검색, 신고·벤, <strong>마지막 접속</strong>, 최근 활동순 정렬
        </li>
        <li>
          <Link href="/admin/news" style={{ color: '#4f46e5' }}>
            뉴스 초안 큐
          </Link>
          — 번역·요약 후 관리자 게시
        </li>
        <li>
          <Link href="/admin/bot-actions" style={{ color: '#4f46e5' }}>
            bot_actions
          </Link>
          — 수집·요약 로그
        </li>
      </ul>
    </main>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        padding: 14,
        background: '#fafafa',
      }}
    >
      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, lineHeight: 1.4 }}>{hint}</div>
    </div>
  );
}
