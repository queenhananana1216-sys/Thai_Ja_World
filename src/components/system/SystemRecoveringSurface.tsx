'use client';

import type { CSSProperties } from 'react';
import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';
import { getClientSiteDisplayName } from '@/lib/site-brand/resolveSiteDisplayName';

const shell: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'clamp(16px, 4vw, 32px)',
  boxSizing: 'border-box',
  background:
    'radial-gradient(1200px 600px at 50% -10%, rgba(59, 130, 246, 0.12), transparent), linear-gradient(180deg, #030712 0%, #0f172a 45%, #020617 100%)',
  color: '#e2e8f0',
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans KR", sans-serif',
};

const glass: CSSProperties = {
  width: '100%',
  maxWidth: 440,
  padding: 'clamp(22px, 3vw, 32px)',
  borderRadius: 22,
  textAlign: 'center',
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  boxShadow: '0 25px 80px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};

const badge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#fcd34d',
  border: '1px solid rgba(251, 191, 36, 0.35)',
  background: 'rgba(251, 191, 36, 0.08)',
};

const btn: CSSProperties = {
  marginTop: 22,
  padding: '12px 26px',
  borderRadius: 999,
  border: '1px solid rgba(96, 165, 250, 0.45)',
  background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.35), rgba(37, 99, 235, 0.2))',
  color: '#dbeafe',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

type Props = {
  /** global-error 는 `<html>` 전체 교체이므로 인라인 스타일만 사용 */
  variant: 'global' | 'segment';
  error: Error & { digest?: string };
  onRetry: () => void;
};

export function SystemRecoveringSurface({ variant, error, onRetry }: Props) {
  const devHint =
    process.env.NODE_ENV === 'development' && error?.message
      ? error.message.slice(0, 900)
      : null;

  if (variant === 'global') {
    const brand = getClientSiteDisplayName();
    return (
      <div style={shell}>
        <div style={glass}>
          <div style={badge}>
            <TjBrandElephantMark size={14} animate="breathe" />
            시스템 복구 중
          </div>
          <h1 style={{ margin: '16px 0 10px', fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
            {brand}
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: '#94a3b8' }}>
            화면을 불러오는 중 문제가 발생했습니다. 인터페이스를 안전하게 복구하고 있습니다. 아래 버튼으로 다시 시도해
            주세요.
          </p>
          {error?.digest ? (
            <p style={{ marginTop: 14, fontSize: 11, color: '#64748b' }}>ref: {error.digest}</p>
          ) : null}
          <button type="button" style={btn} onClick={() => onRetry()}>
            다시 시도
          </button>
          {devHint ? (
            <pre
              style={{
                marginTop: 22,
                textAlign: 'left',
                fontSize: 11,
                color: '#64748b',
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                maxHeight: 220,
                overflow: 'auto',
              }}
            >
              {devHint}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-16 text-slate-100">
      <div
        className="w-full max-w-lg rounded-[22px] border border-slate-500/25 p-8 text-center shadow-2xl backdrop-blur-xl"
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          boxShadow: '0 25px 80px -12px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          <span aria-hidden>◆</span>
          시스템 복구 중
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-50">화면을 안전 모드로 전환했습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          렌더링 중 오류가 감지되어 글라스 패널로 대체했습니다. 아래를 눌러 이 구간을 다시 불러오거나, 잠시 후
          새로고침해 주세요.
        </p>
        {error?.digest ? (
          <p className="mt-3 font-mono text-[11px] text-slate-500">ref: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => onRetry()}
          className="mt-8 min-h-[44px] rounded-full border border-sky-400/45 bg-linear-to-b from-sky-500/35 to-blue-600/20 px-8 py-3 text-sm font-bold text-sky-100 transition hover:from-sky-500/45"
        >
          다시 시도
        </button>
        {devHint ? (
          <pre className="mt-6 max-h-48 overflow-auto text-left font-mono text-[11px] leading-snug text-slate-500">
            {devHint}
          </pre>
        ) : null}
      </div>
      <p className="mt-8 max-w-md text-center text-[11px] text-slate-600">
        문제가 반복되면 시크릿 창으로 열거나 캐시를 비운 뒤 다시 시도해 보세요.
      </p>
    </div>
  );
}
