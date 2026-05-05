'use client';

import Link from 'next/link';
import useSWR from 'swr';

type OmniJson = {
  status?: string;
  all_systems_go?: boolean;
  degradation_errors?: string[];
  checks?: {
    motherbrain?: {
      radar_status?: string;
      core_ok?: boolean;
      extended_ok?: boolean;
      shield_pulse?: boolean;
    };
    biz_audit_queue?: {
      warn?: boolean;
      pending_count?: number;
      hint?: string | null;
      skipped?: boolean;
      error?: string;
    };
    content_pipeline?: {
      ok?: boolean;
      stressful_rows?: number;
      skipped?: boolean;
      error?: string;
    };
    cron_radar?: { ok?: boolean; last_verified_at?: string | null; error?: string };
    database?: { ok?: boolean; ping_ms?: number };
  };
};

const fetcher = async (url: string): Promise<OmniJson> => {
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const j = (await res.json().catch(() => ({}))) as OmniJson;
  return j;
};

export default function AdminSystemHub(props: {
  draftNews: number;
  draftKnowledge: number;
  botHealthLabel: string;
}) {
  const { data, isLoading } = useSWR<OmniJson>('/api/health/omni-radar', fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });

  const radar = data?.checks?.motherbrain?.radar_status ?? (isLoading ? '…' : '—');
  const core = data?.checks?.motherbrain?.core_ok;
  const ext = data?.checks?.motherbrain?.extended_ok;
  const biz = data?.checks?.biz_audit_queue;
  const stress = data?.checks?.content_pipeline;
  const dbMs = data?.checks?.database?.ping_ms;

  const radarClass =
    radar === 'healthy' ? 'admin-hub__pill admin-hub__pill--ok' : radar === 'degraded' ? 'admin-hub__pill admin-hub__pill--warn' : 'admin-hub__pill admin-hub__pill--bad';

  return (
    <section className="admin-hub" aria-label="시스템·파이프라인 상태">
      <div className="admin-hub__grid">
        <article className="admin-hub__card">
          <p className="admin-hub__kicker">옴니 레이더</p>
          <p className={radarClass}>
            {isLoading ? '동기화 중…' : radar === 'healthy' ? '전 구간 정상' : radar === 'degraded' ? '확장 구간 점검' : radar === 'error' ? '코어 이상' : String(radar)}
          </p>
          <p className="admin-hub__meta">
            코어 {core === true ? '✓' : core === false ? '✗' : '—'} · 확장 {ext === true ? '✓' : ext === false ? '△' : '—'}
            {typeof dbMs === 'number' ? ` · DB ${dbMs}ms` : ''}
          </p>
          <Link href="/portal" className="admin-hub__link">
            포털에서 LED와 동일 신호 보기 →
          </Link>
        </article>

        <article className="admin-hub__card">
          <p className="admin-hub__kicker">승인 큐 (초안)</p>
          <p className="admin-hub__metric">
            뉴스 <strong>{props.draftNews}</strong> · 꿀팁 <strong>{props.draftKnowledge}</strong>
          </p>
          <p className="admin-hub__meta">게시 전 AI 컨셉이 쌓인 건수입니다.</p>
          <div className="admin-hub__links">
            <Link href="/admin/news">뉴스 큐</Link>
            <Link href="/admin/knowledge">꿀팁 큐</Link>
          </div>
        </article>

        <article className="admin-hub__card">
          <p className="admin-hub__kicker">봇·콘텐츠 스트레스</p>
          <p className="admin-hub__metric">{props.botHealthLabel}</p>
          <p className="admin-hub__meta">
            {stress?.skipped
              ? '파이프라인 오류 로그 스킵'
              : stress?.ok === false
                ? `최근 부하 · ${stress.stressful_rows ?? '?'}건 (${stress.error ?? 'noise'})`
                : '최근 45분 콘텐츠 파이프라인 양호'}
          </p>
          <Link href="/admin/bot-actions" className="admin-hub__link">
            봇 기록 →
          </Link>
        </article>

        <article className="admin-hub__card">
          <p className="admin-hub__kicker">한인망 감사 큐</p>
          <p className="admin-hub__metric">
            대기 <strong>{biz?.pending_count ?? '—'}</strong>건
            {biz?.warn ? ' · 주의' : ''}
          </p>
          <p className="admin-hub__meta">{biz?.hint?.slice(0, 120) ?? (biz?.error ? `오류: ${biz.error}` : 'Places 감사 제안')}</p>
          <Link href="/admin/biz-audit" className="admin-hub__link">
            수정 제안 열기 →
          </Link>
        </article>
      </div>
    </section>
  );
}
