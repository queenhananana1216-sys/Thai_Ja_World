'use client';

/**
 * DetailDrawer.tsx — 선택된 bot_actions 행의 상세 정보 드로어
 *
 * - input_payload, output_payload, metrics_before, metrics_after 를
 *   포맷된 JSON 블록으로 표시합니다.
 * - Overlay 클릭 또는 × 버튼으로 닫힙니다.
 * - ESC 키 지원 (useEffect)
 */

import { useEffect } from 'react';
import type { BotActionRow } from '@/bots/types/botTypes';
import { StatusBadge } from './BotActionsClient';

interface Props {
  row: BotActionRow;
  onClose: () => void;
}

export default function DetailDrawer({ row, onClose }: Props) {
  // ESC 키로 닫기
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      {/* 오버레이 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.25)',
          zIndex: 40,
        }}
      />

      {/* 드로어 패널 */}
      <aside
        role="dialog"
        aria-label="봇 액션 상세"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100dvh',
          width: '560px',
          maxWidth: '95vw',
          background: '#fff',
          zIndex: 50,
          overflowY: 'auto',
          padding: '20px 24px',
          fontFamily: 'inherit',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.14)',
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
              액션 상세
            </h2>
            <StatusBadge status={row.status} />
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* ── 기본 정보 ────────────────────────────────────────────── */}
        <Section title="기본 정보">
          <FieldGrid
            fields={[
              ['id', row.id],
              ['run_id', row.run_id],
              ['bot_name', row.bot_name],
              ['action_type', row.action_type],
              ['objective', row.objective],
              ['target_entity', row.target_entity ?? '—'],
              ['target_id', row.target_id ?? '—'],
              ['priority', String(row.priority)],
              ['retry_count', String(row.retry_count)],
              ['started_at', row.started_at ?? '—'],
              ['finished_at', row.finished_at ?? '—'],
              ['created_at', new Date(row.created_at).toLocaleString('ko-KR')],
            ]}
          />
          {row.error_code && (
            <FieldGrid
              fields={[
                ['error_code', row.error_code],
                [
                  'error_message',
                  row.error_message ?? '',
                ],
              ]}
              valueColor="#ef4444"
            />
          )}
        </Section>

        {/* ── JSON 페이로드 ─────────────────────────────────────────── */}
        <Section title="input_payload">
          <JsonBlock data={row.input_payload} />
        </Section>
        <Section title="output_payload">
          <JsonBlock data={row.output_payload} />
        </Section>
        <Section title="metrics_before">
          <JsonBlock data={row.metrics_before} />
        </Section>
        <Section title="metrics_after">
          <JsonBlock data={row.metrics_after} />
        </Section>
      </aside>
    </>
  );
}

// ── 헬퍼 컴포넌트 ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: '18px' }}>
      <h3
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid #f3f4f6',
          paddingBottom: '4px',
          marginBottom: '8px',
          marginTop: 0,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function FieldGrid({
  fields,
  valueColor,
}: {
  fields: [string, string][];
  valueColor?: string;
}) {
  return (
    <div style={{ display: 'grid', gap: '3px 0', marginBottom: '6px' }}>
      {fields.map(([label, value]) => (
        <div
          key={label}
          style={{
            display: 'grid',
            gridTemplateColumns: '130px 1fr',
            gap: '4px',
            fontSize: '12px',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: '#6b7280', fontWeight: 600 }}>{label}</span>
          <span
            style={{
              wordBreak: 'break-all',
              color: valueColor ?? 'inherit',
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function JsonBlock({ data }: { data: Record<string, unknown> }) {
  const isEmpty = Object.keys(data).length === 0;
  if (isEmpty) {
    return (
      <span style={{ color: '#9ca3af', fontSize: '12px' }}>{'{}'}</span>
    );
  }
  return (
    <pre
      style={{
        background: '#1e1e2e',
        color: '#cdd6f4',
        padding: '12px',
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: 1.6,
        overflowX: 'auto',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
