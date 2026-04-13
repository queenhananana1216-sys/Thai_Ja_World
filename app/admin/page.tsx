import Link from 'next/link';
import { getKstDayRangeISO } from '@/lib/admin/kstDayRange';
import {
  knowledgePublishModeEnvRaw,
  knowledgePublishPipelineHint,
  knowledgeInsertAsPublished,
} from '@/lib/knowledge/knowledgePublishMode';
import {
  newsInsertAsPublished,
  newsPublishModeEnvRaw,
  newsPublishPipelineHint,
} from '@/lib/news/newsPublishMode';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export default async function AdminDashboardPage() {
  const fiveAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const kstToday = getKstDayRangeISO();

  let totalUsers = 0;
  let signupsToday = 0;
  let recentActive = 0;
  let draftNews: number | null = null;
  let publishedNews: number | null = null;
  let draftKnowledge: number | null = null;
  let draftLocalSpots: number | null = null;
  let dbNote: string | null = null;

  try {
    const admin = createServiceRoleClient();

    const [
      { count: c1, error: e1 },
      { count: cToday, error: eToday },
      { count: c2, error: e2 },
      { count: c3, error: e3 },
      { count: cPub, error: ePub },
      { count: cK, error: eK },
      { count: cLs, error: eLs },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', kstToday.start)
        .lt('created_at', kstToday.end),
      admin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen_at', fiveAgo),
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', false),
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', true),
      admin.from('processed_knowledge').select('*', { count: 'exact', head: true }).eq('published', false),
      admin.from('local_spots').select('*', { count: 'exact', head: true }).eq('is_published', false),
    ]);

    if (e1) {
      dbNote = `프로필 수 집계 실패: ${e1.message}`;
    } else {
      totalUsers = c1 ?? 0;
    }
    if (eToday) {
      if (!dbNote) dbNote = `오늘 가입 수 집계 실패: ${eToday.message}`;
    } else {
      signupsToday = cToday ?? 0;
    }
    if (e2) {
      if (!dbNote) dbNote = `활동 중 집계 불가(010 마이그레이션·last_seen_at 확인): ${e2.message}`;
    } else {
      recentActive = c2 ?? 0;
    }
    if (e3) {
      if (!dbNote) dbNote = `뉴스 초안 집계 생략(009 마이그레이션·키 확인): ${e3.message}`;
    } else {
      draftNews = c3 ?? 0;
    }
    if (!ePub) {
      publishedNews = cPub ?? 0;
    }
    if (!eK) {
      draftKnowledge = cK ?? 0;
    }
    if (!eLs) {
      draftLocalSpots = cLs ?? 0;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    dbNote = msg.includes('SUPABASE_SERVICE_ROLE_KEY') || msg.includes('Invalid API key')
      ? `${msg} — Vercel/배포 환경의 SUPABASE_SERVICE_ROLE_KEY 가 해당 Supabase 프로젝트 service_role 키와 일치하는지 확인하세요.`
      : msg;
  }

  return (
    <main className="admin-page">
      <h1 className="admin-dash__title">관리자 개요</h1>
      <p className="admin-dash__lead">
        태자 월드 회원·접속·뉴스 초안 지표입니다. <strong>마지막 접속</strong>은 사이트 하트비트로 갱신되는{' '}
        <code>profiles.last_seen_at</code> 기준이며, Supabase Auth의 “최종 로그인”과는 다를 수 있습니다.
      </p>

      {dbNote && <div className="admin-dash__alert">{dbNote}</div>}

      <section className="admin-dash__pipeline" aria-label="게시 파이프라인">
        <h2>뉴스·지식이 «승인 대기»에 안 보일 때</h2>
        <div className="admin-dash__pipeline-grid">
          <div className="admin-dash__pipeline-block">
            <strong>뉴스 (RSS → 요약)</strong>
            <code>
              NEWS_PUBLISH_MODE={newsPublishModeEnvRaw()} → 실제 동작:{' '}
              {newsInsertAsPublished() ? 'auto(즉시 공개)' : 'manual(초안만)'}
            </code>
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>{newsPublishPipelineHint()}</p>
          </div>
          <div className="admin-dash__pipeline-block">
            <strong>지식 (별도 크론·파이프라인)</strong>
            <code>
              KNOWLEDGE_PUBLISH_MODE={knowledgePublishModeEnvRaw()} → 실제 동작:{' '}
              {knowledgeInsertAsPublished() ? 'auto(즉시 공개)' : 'manual(초안만)'}
            </code>
            <p style={{ margin: '8px 0 0', fontSize: 12 }}>{knowledgePublishPipelineHint()}</p>
          </div>
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>
          <strong>아침 루틴:</strong> 크론이 돌면 뉴스·지식 초안이 쌓입니다.{' '}
          <Link href="/admin/publish">최종 승인 허브</Link>에서 편집 팁을 보고,{' '}
          <Link href="/admin/news">뉴스 큐</Link>·<Link href="/admin/knowledge">지식 큐</Link>에서 승인하면 홈·광장에
          반영됩니다. 맛집·마사지 초안은{' '}
          <Link href="/admin/local-spots">로컬 가게</Link>에서 «승인·공개» 후 문구만 손보면 됩니다. 수동으로 봇을 돌릴
          때는 <code>POST /api/bot/…</code> 요청에 <code>Authorization: Bearer {'<CRON_SECRET>'}</code> 를 붙이세요
          (로컬에서 시크릿 미설정이면 검증 생략).
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>
          <strong>관리자 계정 추가:</strong> Supabase 대시보드가 아니라 <strong>Vercel(배포) 환경 변수</strong>{' '}
          <code>ADMIN_ALLOWED_EMAILS</code>에 이메일을 쉼표·세미콜론·공백으로 구분해 넣으세요. 그 이메일로{' '}
          <strong>Supabase Auth에 가입·로그인</strong>된 사용자만 /admin 과 관리자 API를 쓸 수 있습니다.
        </p>
      </section>

      <div className="admin-dash__grid">
        <StatCard
          title="총 이용자(프로필)"
          value={String(totalUsers)}
          hint="auth.users 와 1:1 인 public.profiles 행 수"
        />
        <StatCard
          title="오늘 회원가입(한국일 기준)"
          value={String(signupsToday)}
          hint={`KST ${kstToday.dateLabel} 자정~24시 구간 · profiles.created_at`}
        />
        <StatCard
          title="지금 활동 중(추정)"
          value={String(recentActive)}
          hint="최근 5분 이내 last_seen_at 하트비트(010 마이그레이션 필요)"
        />
        <StatCard
          title="뉴스 초안(미게시)"
          value={draftNews === null ? '—' : String(draftNews)}
          hint="미게시 초안. auto 모드면 0일 수 있음"
        />
        <StatCard
          title="뉴스 공개(처리분)"
          value={publishedNews === null ? '—' : String(publishedNews)}
          hint="processed_news 중 published=true — 홈·뉴스에 노출되는 건"
        />
        <StatCard
          title="지식 초안(미게시)"
          value={draftKnowledge === null ? '—' : String(draftKnowledge)}
          hint="KNOWLEDGE_PUBLISH_MODE=manual(기본)일 때 /admin/knowledge 큐"
        />
        <StatCard
          title="로컬 가게·비공개(승인 대기)"
          value={draftLocalSpots === null ? '—' : String(draftLocalSpots)}
          hint="local_spots 중 is_published=false — 시드 초안·신규 등록"
        />
      </div>

      <ul className="admin-dash__links">
        <li>
          <Link href="/admin/home-hero">
            홈 메인 문구
            <span>히어로·비회원 안내·한 줄 제보 띠 — 한·태 각각 수정</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/users">
            이용자 디렉터리
            <span>검색 · 신고·벤 · 마지막 접속 · 활동 중 표시 · 가입일</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/news">
            뉴스 초안 큐
            <span>번역·요약 후 게시</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/knowledge">
            지식 큐
            <span>RSS·지식 파이프라인 초안 승인</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/bot-actions">
            봇 기록
            <span>수집·가공 로그 · 7일 후 자동 삭제(cron)</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/ux-bot">
            UX 관리자봇
            <span>5분 집계·플래그 자동조정 이력 확인</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/local-spots">
            로컬 가게 · 맛집 · 마사지
            <span>
              승인 대기 행은 «승인·공개» 한 번으로 노출 — 이후 수정. <code>local_spots</code> /{' '}
              <code>/shop/…</code>·<code>/my-local-shop</code>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/admin/community-posts">
            광장 게시글 · 중고·알바
            <span>
              <code>posts</code> 최신 200건 — 운영 삭제. 작성자는 글 화면 «내 글 메뉴»에서도 삭제 가능
            </span>
          </Link>
        </li>
        <li>
          <Link href="/admin/premium-banners">
            프리미엄 배너
            <span>상단 바·홈 스트립 등 전역 프로모</span>
          </Link>
        </li>
      </ul>
    </main>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="admin-dash__card">
      <div className="admin-dash__card-label">{title}</div>
      <div className="admin-dash__card-value">{value}</div>
      <div className="admin-dash__card-hint">{hint}</div>
    </div>
  );
}
