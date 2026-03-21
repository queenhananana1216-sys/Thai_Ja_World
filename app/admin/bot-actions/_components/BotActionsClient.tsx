'use client';

/**
 * BotActionsClient.tsx — 필터 폼 + 테이블/타임라인 클라이언트 컴포넌트
 *
 * - 필터 폼 상태는 로컬 state 로 관리, 조회 버튼 클릭 시 URL 파라미터를 갱신
 * - Server Component (page.tsx) 가 새 파라미터로 서버 재조회
 * - 행 클릭 시 DetailDrawer 열림
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AdminFilters,
  BotActionRow,
  BotActionStatus,
  BotActionType,
} from '@/bots/types/botTypes';
import DetailDrawer from './DetailDrawer';
import RunTimeline from './RunTimeline';

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  rows: BotActionRow[];
  botNames: string[];
  initialFilters: AdminFilters;
}

// ── 상수 ──────────────────────────────────────────────────────────────────

const ACTION_TYPES: BotActionType[] = [
  'collect_data',
  'analyze',
  'publish',
  'alert',
  'heal',
];

const STATUSES: BotActionStatus[] = [
  'queued',
  'running',
  'success',
  'failed',
  'skipped',
];

export const STATUS_COLORS: Record<BotActionStatus, string> = {
  queued: '#6b7280',
  running: '#3b82f6',
  success: '#22c55e',
  failed: '#ef4444',
  skipped: '#f59e0b',
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────────

export default function BotActionsClient({
  rows,
  botNames,
  initialFilters,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<AdminFilters>(initialFilters);
  const [selectedRow, setSelectedRow] = useState<BotActionRow | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // ── 필터 적용 ──────────────────────────────────────────────────────────

  function applyFilters() {
    const p = new URLSearchParams();
    if (filters.bot_name) p.set('bot_name', filters.bot_name);
    if (filters.action_type) p.set('action_type', filters.action_type);
    if (filters.status) p.set('status', filters.status);
    if (filters.date_from) p.set('date_from', filters.date_from);
    if (filters.date_to) p.set('date_to', filters.date_to);
    startTransition(() => {
      router.push(`/admin/bot-actions?${p.toString()}`);
    });
  }

  function resetFilters() {
    setFilters({});
    startTransition(() => {
      router.push('/admin/bot-actions');
    });
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── 필터 바 ─────────────────────────────────────────────────── */}
      <div style={filterBarStyle}>
        {/* bot_name */}
        <label style={labelStyle}>
          봇
          <select
            value={filters.bot_name ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                bot_name: e.target.value || undefined,
              }))
            }
            style={selectStyle}
          >
            <option value="">전체</option>
            {botNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {/* action_type */}
        <label style={labelStyle}>
          액션 타입
          <select
            value={filters.action_type ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                action_type: (e.target.value as BotActionType) || '',
              }))
            }
            style={selectStyle}
          >
            <option value="">전체</option>
            {ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {/* status */}
        <label style={labelStyle}>
          상태
          <select
            value={filters.status ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                status: (e.target.value as BotActionStatus) || '',
              }))
            }
            style={selectStyle}
          >
            <option value="">전체</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        {/* date_from */}
        <label style={labelStyle}>
          시작일
          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                date_from: e.target.value || undefined,
              }))
            }
            style={inputStyle}
          />
        </label>

        {/* date_to */}
        <label style={labelStyle}>
          종료일
          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                date_to: e.target.value || undefined,
              }))
            }
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
          <button
            onClick={applyFilters}
            disabled={isPending}
            style={btnStyle('#2563eb')}
          >
            {isPending ? '조회 중…' : '조회'}
          </button>
          <button
            onClick={resetFilters}
            disabled={isPending}
            style={btnStyle('#6b7280')}
          >
            초기화
          </button>
        </div>
      </div>

      {/* ── 뷰 전환 탭 ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          marginBottom: '12px',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => setViewMode('table')}
          style={btnStyle(viewMode === 'table' ? '#1e40af' : '#9ca3af')}
        >
          테이블
        </button>
        <button
          onClick={() => setViewMode('timeline')}
          style={btnStyle(viewMode === 'timeline' ? '#1e40af' : '#9ca3af')}
        >
          타임라인 (run_id 별)
        </button>
        <span
          style={{
            marginLeft: 'auto',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          {rows.length}개 결과
          {rows.length === 200 && (
            <span style={{ color: '#f59e0b', marginLeft: '6px' }}>
              ⚠ 최대치 도달 — 필터를 좁혀주세요
            </span>
          )}
        </span>
      </div>

      {/* ── 콘텐츠 ─────────────────────────────────────────────────── */}
      {viewMode === 'table' ? (
        <BotActionsTable
          rows={rows}
          selectedId={selectedRow?.id}
          onSelect={setSelectedRow}
        />
      ) : (
        <RunTimeline rows={rows} onSelectRow={setSelectedRow} />
      )}

      {/* ── 상세 드로어 ────────────────────────────────────────────── */}
      {selectedRow && (
        <DetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  );
}

// ── 테이블 서브컴포넌트 ────────────────────────────────────────────────────

function BotActionsTable({
  rows,
  selectedId,
  onSelect,
}: {
  rows: BotActionRow[];
  selectedId?: string;
  onSelect: (row: BotActionRow) => void;
}) {
  const COLS = [
    'created_at',
    'bot_name',
    'action_type',
    'status',
    'objective',
    'priority',
    'retry_count',
    'run_id',
  ] as const;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c} style={thStyle}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={COLS.length}
                style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}
              >
                결과 없음
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row)}
              style={{
                cursor: 'pointer',
                background: selectedId === row.id ? '#eff6ff' : undefined,
              }}
              onMouseEnter={(e) => {
                if (selectedId !== row.id)
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (selectedId !== row.id)
                  (e.currentTarget as HTMLTableRowElement).style.background = '';
              }}
            >
              <td style={tdStyle}>
                {new Date(row.created_at).toLocaleString('ko-KR')}
              </td>
              <td style={tdStyle}>{row.bot_name}</td>
              <td style={tdStyle}>{row.action_type}</td>
              <td style={tdStyle}>
                <StatusBadge status={row.status} />
              </td>
              <td
                style={{
                  ...tdStyle,
                  maxWidth: '220px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.objective}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {row.priority}
              </td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {row.retry_count}
              </td>
              <td
                style={{
                  ...tdStyle,
                  color: '#9ca3af',
                  fontSize: '11px',
                  maxWidth: '130px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.run_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── StatusBadge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: BotActionStatus }) {
  const color = STATUS_COLORS[status];
  return (
    <span
      style={{
        padding: '1px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        background: `${color}22`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}

// ── Style objects ──────────────────────────────────────────────────────────

const filterBarStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  alignItems: 'flex-end',
  padding: '12px 16px',
  background: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  marginBottom: '14px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  fontSize: '11px',
  color: '#6b7280',
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '12px',
  fontFamily: 'inherit',
  background: '#fff',
  minWidth: '120px',
};

const inputStyle: React.CSSProperties = {
  ...selectStyle,
  cursor: 'pointer',
};

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'inherit',
    height: '30px',
  };
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  background: '#f3f4f6',
  border: '1px solid #e5e7eb',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  color: '#374151',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #e5e7eb',
  verticalAlign: 'top',
};
