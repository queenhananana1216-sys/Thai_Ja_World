'use client';

/**
 * RunTimeline.tsx — run_id 별 그룹 타임라인 뷰
 *
 * - rows 를 run_id 로 그룹핑
 * - 각 그룹은 가장 최근 생성일 기준 내림차순 정렬
 * - 그룹 내 액션은 created_at 오름차순 (실행 순서)
 * - 액션 행 클릭 시 onSelectRow 호출 → 드로어 열림
 */

import type { BotActionRow, BotActionStatus } from '@/bots/types/botTypes';
import { StatusBadge } from './BotActionsClient';

interface Props {
  rows: BotActionRow[];
  onSelectRow: (row: BotActionRow) => void;
}

// ── 그룹 집계 헬퍼 ────────────────────────────────────────────────────────

function groupByRunId(rows: BotActionRow[]): Map<string, BotActionRow[]> {
  const map = new Map<string, BotActionRow[]>();
  for (const row of rows) {
    const existing = map.get(row.run_id);
    if (existing) {
      existing.push(row);
    } else {
      map.set(row.run_id, [row]);
    }
  }
  return map;
}

function groupOverallStatus(rows: BotActionRow[]): BotActionStatus {
  if (rows.some((r) => r.status === 'failed')) return 'failed';
  if (rows.some((r) => r.status === 'running')) return 'running';
  if (rows.some((r) => r.status === 'queued')) return 'queued';
  if (rows.every((r) => r.status === 'skipped')) return 'skipped';
  if (rows.every((r) => r.status === 'success')) return 'success';
  return 'running';
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function RunTimeline({ rows, onSelectRow }: Props) {
  const groups = groupByRunId(rows);

  // 그룹을 "가장 최근 created_at" 기준 내림차순 정렬
  const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => {
    const aMax = Math.max(
      ...a.map((r) => new Date(r.created_at).getTime()),
    );
    const bMax = Math.max(
      ...b.map((r) => new Date(r.created_at).getTime()),
    );
    return bMax - aMax;
  });

  if (sortedGroups.length === 0) {
    return (
      <p style={{ color: '#9ca3af', textAlign: 'center', padding: '32px' }}>
        결과 없음
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sortedGroups.map(([runId, groupRows]) => {
        const overallStatus = groupOverallStatus(groupRows);
        const sorted = [...groupRows].sort(
          (a, b) =>
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime(),
        );
        const firstRow = sorted[0];
        const startTime = firstRow
          ? new Date(firstRow.created_at).toLocaleString('ko-KR')
          : '—';

        return (
          <div
            key={runId}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            {/* 그룹 헤더 */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                padding: '8px 14px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                fontSize: '11px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: '#374151',
                  whiteSpace: 'nowrap',
                }}
              >
                run_id
              </span>
              <span
                style={{
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '340px',
                }}
                title={runId}
              >
                {runId}
              </span>
              <span style={{ color: '#9ca3af' }}>{startTime}</span>
              <span
                style={{
                  color: '#6b7280',
                  background: '#e5e7eb',
                  padding: '1px 6px',
                  borderRadius: '4px',
                }}
              >
                {groupRows.length}개 액션
              </span>
              <span style={{ marginLeft: 'auto' }}>
                <StatusBadge status={overallStatus} />
              </span>
            </div>

            {/* 액션 목록 */}
            <div style={{ padding: '6px 14px 10px' }}>
              {sorted.map((row, idx) => {
                const isLast = idx === sorted.length - 1;
                return (
                  <div
                    key={row.id}
                    style={{ display: 'flex', gap: '0', alignItems: 'flex-start' }}
                  >
                    {/* 타임라인 선 + 점 */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '20px',
                        flexShrink: 0,
                        paddingTop: '10px',
                      }}
                    >
                      <TimelineDot status={row.status} />
                      {!isLast && (
                        <div
                          style={{
                            width: '2px',
                            flex: 1,
                            minHeight: '16px',
                            background: '#e5e7eb',
                          }}
                        />
                      )}
                    </div>

                    {/* 액션 행 */}
                    <div
                      onClick={() => onSelectRow(row)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '5px 8px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: isLast ? 0 : '2px',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.background =
                          '';
                      }}
                    >
                      <StatusBadge status={row.status} />
                      <span style={{ fontWeight: 600 }}>
                        {row.action_type}
                      </span>
                      <span style={{ color: '#6b7280' }}>{row.bot_name}</span>
                      {row.error_code && (
                        <span
                          style={{
                            color: '#ef4444',
                            fontSize: '11px',
                            background: '#fef2f2',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {row.error_code}
                        </span>
                      )}
                      <span
                        style={{
                          marginLeft: 'auto',
                          color: '#9ca3af',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {new Date(row.created_at).toLocaleTimeString('ko-KR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 타임라인 점 ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<BotActionStatus, string> = {
  queued: '#6b7280',
  running: '#3b82f6',
  success: '#22c55e',
  failed: '#ef4444',
  skipped: '#f59e0b',
};

function TimelineDot({ status }: { status: BotActionStatus }) {
  return (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: STATUS_COLORS[status],
        flexShrink: 0,
        border: `2px solid ${STATUS_COLORS[status]}44`,
      }}
    />
  );
}
