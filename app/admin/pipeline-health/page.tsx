/**
 * app/admin/pipeline-health/page.tsx — 봇 파이프라인 헬스 대시보드 (Server Component)
 *
 * 최근 72h 기준 각 파이프라인 컴포넌트의 실행 상태를 시각적으로 표시합니다.
 * 별도 필터 없이 항상 최신 상태를 서버에서 읽어 렌더링합니다.
 *
 * 상태 색상:
 *   🟢 healthy  — 최근 24h 성공 있음
 *   🟡 degraded — 24–72h 내 성공 있거나 오래된 마지막 실행
 *   🔴 down     — 72h 내 성공 없고 실패 기록 있음
 *   ⚪ unknown  — 72h 내 기록 없음
 */

import Link from 'next/link';
import { getPipelineHealthReport, type PipelineHealthStatus } from '@/bots/adapters/pipelineHealthQuery';

// Next.js 15: 페이지 재검증 주기 (60초마다 갱신)
export const revalidate = 60;

// ── 유틸 ──────────────────────────────────────────────────────────────────

const STATUS_EMOJI: Record<PipelineHealthStatus, string> = {
  healthy: '🟢',
  degraded: '🟡',
  down: '🔴',
  unknown: '⚪',
};

const STATUS_LABEL_KO: Record<PipelineHealthStatus, string> = {
  healthy: '정상',
  degraded: '저하',
  down: '중단',
  unknown: '알 수 없음',
};

const STATUS_BG: Record<PipelineHealthStatus, string> = {
  healthy: '#f0fdf4',
  degraded: '#fefce8',
  down: '#fef2f2',
  unknown: '#f9fafb',
};

const STATUS_BORDER: Record<PipelineHealthStatus, string> = {
  healthy: '#bbf7d0',
  degraded: '#fde68a',
  down: '#fecaca',
  unknown: '#e5e7eb',
};

const STATUS_TEXT: Record<PipelineHealthStatus, string> = {
  healthy: '#166534',
  degraded: '#92400e',
  down: '#991b1b',
  unknown: '#6b7280',
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── 페이지 ────────────────────────────────────────────────────────────────

export default async function PipelineHealthPage() {
  const report = await getPipelineHealthReport();

  return (
    <main style={{ padding: '20px 24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* ── 헤더 ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
          파이프라인 헬스
        </h1>
        <OverallBadge status={report.overall} />
        <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>
          기준 시각: {fmtDate(report.checked_at)} (KST)
        </span>
      </div>

      {/* ── 안내 ──────────────────────────────────────────────────────── */}
      <p
        style={{
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: 1.6,
          marginBottom: '20px',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '10px 14px',
        }}
      >
        최근 <strong>72h</strong> bot_actions 기록을 기반으로 판단합니다.
        &nbsp;🟢&nbsp;정상: 24h 내 성공 &nbsp;|&nbsp; 🟡&nbsp;저하: 24–72h 내 성공 또는 오래된 실행
        &nbsp;|&nbsp; 🔴&nbsp;중단: 성공 없고 실패 있음 &nbsp;|&nbsp; ⚪&nbsp;알 수 없음: 기록 없음.
        &nbsp;상세 로그는{' '}
        <Link href="/admin/bot-actions" style={{ color: '#2563eb' }}>
          봇 기록
        </Link>
        에서 확인하세요.
      </p>

      {/* ── 컴포넌트 카드 목록 ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '12px',
        }}
      >
        {report.components.map((comp) => (
          <div
            key={comp.bot_name}
            style={{
              background: STATUS_BG[comp.status],
              border: `1px solid ${STATUS_BORDER[comp.status]}`,
              borderRadius: '8px',
              padding: '14px 16px',
            }}
          >
            {/* 카드 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '16px' }}>
                {STATUS_EMOJI[comp.status]}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#111827',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {comp.label}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  {comp.bot_name}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: STATUS_BORDER[comp.status],
                  color: STATUS_TEXT[comp.status],
                  whiteSpace: 'nowrap',
                }}
              >
                {STATUS_LABEL_KO[comp.status]}
              </span>
            </div>

            {/* 통계 격자 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <StatMini
                label="성공(24h)"
                value={comp.summary.success_24h}
                highlight={comp.summary.success_24h > 0}
              />
              <StatMini
                label="실패(24h)"
                value={comp.summary.failed_24h}
                danger={comp.summary.failed_24h > 0}
              />
              <StatMini
                label="실행 중"
                value={comp.summary.running_24h}
              />
            </div>

            {/* 마지막 실행·성공 */}
            <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>
              <span>
                마지막 실행:{' '}
                <strong style={{ color: '#374151' }}>
                  {fmtDate(comp.summary.last_run_at)}
                </strong>
                {comp.summary.last_status && (
                  <span style={{ marginLeft: '4px', color: '#9ca3af' }}>
                    ({comp.summary.last_status})
                  </span>
                )}
              </span>
              {comp.summary.last_success_at && (
                <>
                  <span style={{ margin: '0 4px', color: '#d1d5db' }}>|</span>
                  <span>
                    마지막 성공:{' '}
                    <strong style={{ color: '#374151' }}>
                      {fmtDate(comp.summary.last_success_at)}
                    </strong>
                  </span>
                </>
              )}
              {comp.cron_path && (
                <>
                  <br />
                  <span style={{ color: '#9ca3af' }}>
                    cron: <code style={{ fontSize: '10px' }}>{comp.cron_path}</code>
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 수동 트리거 안내 ──────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '24px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
          padding: '12px 16px',
          fontSize: '12px',
          color: '#0c4a6e',
          lineHeight: 1.7,
        }}
      >
        <strong>수동 파이프라인 트리거</strong>
        <br />
        뉴스:{' '}
        <code style={{ fontSize: '11px', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>
          POST /api/bot/news-pipeline
        </code>
        &nbsp;|&nbsp; 지식:{' '}
        <code style={{ fontSize: '11px', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>
          POST /api/bot/knowledge-pipeline
        </code>
        &nbsp;|&nbsp; 셀프힐링:{' '}
        <code style={{ fontSize: '11px', background: '#e0f2fe', padding: '1px 4px', borderRadius: 3 }}>
          POST /api/bot/heal
        </code>
        <br />
        <span style={{ color: '#0369a1' }}>
          요청 시 <code style={{ fontSize: '11px' }}>Authorization: Bearer {'<CRON_SECRET>'}</code> 헤더 필요
          (로컬 미설정 시 생략 가능).
        </span>
      </div>
    </main>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────

function OverallBadge({ status }: { status: PipelineHealthStatus }) {
  return (
    <span
      style={{
        fontSize: '12px',
        fontWeight: 700,
        padding: '3px 10px',
        borderRadius: '9999px',
        background: STATUS_BG[status],
        border: `1px solid ${STATUS_BORDER[status]}`,
        color: STATUS_TEXT[status],
      }}
    >
      {STATUS_EMOJI[status]} 전체: {STATUS_LABEL_KO[status]}
    </span>
  );
}

function StatMini({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  danger?: boolean;
}) {
  const color = danger && value > 0 ? '#dc2626' : highlight && value > 0 ? '#16a34a' : '#374151';
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.6)',
        borderRadius: '4px',
        padding: '5px 7px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '16px', fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}
