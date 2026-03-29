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
  let dbNote: string | null = null;

  try {
    const admin = createServiceRoleClient();

    const { count: c1, error: e1 } = await admin.from('profiles').select('*', { count: 'exact', head: true });
    if (e1) {
      dbNote = `프로필 수 집계 실패: ${e1.message}`;
    } else {
      totalUsers = c1 ?? 0;
    }

    const { count: cToday, error: eToday } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', kstToday.start)
      .lt('created_at', kstToday.end);
    if (eToday) {
      if (!dbNote) dbNote = `오늘 가입 수 집계 실패: ${eToday.message}`;
    } else {
      signupsToday = cToday ?? 0;
    }

    const { count: c2, error: e2 } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen_at', fiveAgo);
    if (e2) {
      if (!dbNote) dbNote = `활동 중 집계 불가(010 마이그레이션·last_seen_at 확인): ${e2.message}`;
    } else {
      recentActive = c2 ?? 0;
    }

    const { count: c3, error: e3 } = await admin
      .from('processed_news')
      .select('*', { count: 'exact', head: true })
      .eq('published', false);
    if (e3) {
      if (!dbNote) dbNote = `뉴스 초안 집계 생략(009 마이그레이션·키 확인): ${e3.message}`;
    } else {
      draftNews = c3 ?? 0;
    }

    const { count: cPub, error: ePub } = await admin
      .from('processed_news')
      .select('*', { count: 'exact', head: true })
      .eq('published', true);
    if (!ePub) {
      publishedNews = cPub ?? 0;
    }

    const { count: cK, error: eK } = await admin
      .from('processed_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('published', false);
    if (!eK) {
      draftKnowledge = cK ?? 0;
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
          hint="manual 모드에서만 쌓임. auto면 0이 정상"
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
          <Link href="/admin/bot-actions">
            봇 기록
            <span>수집·요약 로그</span>
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
