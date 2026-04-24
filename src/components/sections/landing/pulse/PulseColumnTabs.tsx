'use client';

/**
 * 모바일(<1024px) 전용 Philgo 스타일 탭 뷰.
 * 데스크톱에서는 전체 `.tj-pulse-mobile-tabs` 컨테이너가 `display:none` 으로 숨겨지고,
 * 데스크톱은 CommunityPulseSection 의 grid 레이아웃이 그대로 보인다.
 *
 * 클라이언트 컴포넌트지만 로직은 useState 1개 뿐이라 페이로드 미미.
 * 데이터(PulseColumn[])는 이미 서버에서 받아온 것을 props 로 넘긴다 — 추가 fetch 없음.
 */

import { useState, useCallback } from 'react';
import { PulseCard, ACCENT_MAP } from './PulseCard';
import type { PulseColumn } from '@/lib/landing/fetchCommunityPulse';
import type { Locale } from '@/i18n/types';

type Props = {
  columns: PulseColumn[];
  locale: Locale;
  /** light: 밝은 포털 카드(CommunityPulseSection 다크 히어로 구역은 기본 dark) */
  tone?: 'dark' | 'light';
};

export function PulseColumnTabs({ columns, locale, tone = 'dark' }: Props) {
  const [idx, setIdx] = useState(0);

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIdx((i) => (i + 1) % columns.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIdx((i) => (i - 1 + columns.length) % columns.length);
      }
    },
    [columns.length],
  );

  if (columns.length === 0) return null;
  const safeIdx = Math.min(Math.max(0, idx), columns.length - 1);
  const active = columns[safeIdx] ?? columns[0];
  if (!active) return null;
  const accent = ACCENT_MAP[active.accent];
  const tabBorderColor = tone === 'light' ? 'rgba(148,163,184,0.45)' : 'rgba(255,255,255,0.08)';
  const activeColor = tone === 'light' ? '#0f172a' : '#f8fafc';
  const idleColor = tone === 'light' ? '#64748b' : '#94a3b8';
  const panelBg = tone === 'light' ? '#fff' : 'rgba(15,17,40,0.7)';
  const panelBorder = tone === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)';

  return (
    <div className="tj-pulse-mobile-tabs">
      {/* 가로 스크롤 탭 바 — Philgo 처럼 "뉴스 · 여행 · 정보 · 필독 · 생활의 팁" 리본 */}
      <div
        role="tablist"
        aria-label={locale === 'th' ? 'หมวดเนื้อหาชุมชน' : '광장 카테고리 탭'}
        onKeyDown={onKey}
        style={{
          display: 'flex',
          gap: 4,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 6,
          marginBottom: 12,
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
          borderBottom: `1px solid ${tabBorderColor}`,
        }}
      >
        {columns.map((c, i) => {
          const isActive = i === idx;
          const t = ACCENT_MAP[c.accent];
          return (
            <button
              key={c.label}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tj-pulse-panel-${i}`}
              id={`tj-pulse-tab-${i}`}
              onClick={() => setIdx(i)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                flexShrink: 0,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? activeColor : idleColor,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 120ms ease',
              }}
            >
              {c.label}
              {isActive ? (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 10,
                    right: 10,
                    bottom: -1,
                    height: 2,
                    borderRadius: 2,
                    background: tone === 'light' ? t.title : t.tabBorder,
                  }}
                />
              ) : null}
              {c.todayCount > 0 ? (
                <span
                  aria-hidden
                  style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isActive ? (tone === 'light' ? '#db2777' : '#f9a8d4') : '#64748b',
                  }}
                >
                  {c.todayCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* 활성 패널 */}
      <div
        role="tabpanel"
        id={`tj-pulse-panel-${idx}`}
        aria-labelledby={`tj-pulse-tab-${idx}`}
        style={
          tone === 'light'
            ? {
                background: panelBg,
                border: panelBorder,
                borderRadius: 8,
                padding: 12,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
              }
            : {
                background: 'rgba(15,17,40,0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: 14,
                boxShadow: '0 8px 28px rgba(2,6,23,0.35)',
                borderTopWidth: 2,
                borderTopColor: 'transparent',
                backgroundImage: `linear-gradient(rgba(15,17,40,0.7),rgba(15,17,40,0.7)), ${accent.tabBorder}`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
              }
        }
      >
        <PulseCard col={active} locale={locale} variant="panel" tone={tone} />
      </div>
    </div>
  );
}
