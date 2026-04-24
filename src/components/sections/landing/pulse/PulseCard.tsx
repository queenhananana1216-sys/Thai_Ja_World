/**
 * 서버/클라이언트 양쪽에서 재사용 가능한 단일 컬럼 카드.
 * (CommunityPulseSection 의 데스크톱 그리드 + PulseColumnTabs 의 모바일 탭 뷰 공용)
 *
 * 'use client' 를 붙이지 않아 서버 컴포넌트에서도 그대로 가능. Link 는 양쪽에서 동작.
 * 런타임 JS 없음 — hover 효과는 페이지 단에 주입된 <style> 에서 처리.
 */

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { PulseColumn, PulseItem } from '@/lib/landing/fetchCommunityPulse';
import type { Locale } from '@/i18n/types';

export const ACCENT_MAP: Record<
  PulseColumn['accent'],
  { pill: string; title: string; tabBorder: string }
> = {
  lavender: {
    pill: 'rgba(196,181,253,0.18)',
    title: '#c4b5fd',
    tabBorder: 'linear-gradient(90deg,#c4b5fd,#f9a8d4)',
  },
  pink: {
    pill: 'rgba(249,168,212,0.18)',
    title: '#fbcfe8',
    tabBorder: 'linear-gradient(90deg,#f9a8d4,#fde68a)',
  },
  amber: {
    pill: 'rgba(251,191,36,0.18)',
    title: '#fde68a',
    tabBorder: 'linear-gradient(90deg,#fde68a,#fcd34d)',
  },
  sky: {
    pill: 'rgba(125,211,252,0.18)',
    title: '#bae6fd',
    tabBorder: 'linear-gradient(90deg,#bae6fd,#a5b4fc)',
  },
  lime: {
    pill: 'rgba(190,242,100,0.18)',
    title: '#d9f99d',
    tabBorder: 'linear-gradient(90deg,#d9f99d,#bbf7d0)',
  },
};

function relTime(iso: string | null, locale: Locale): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const lang = locale === 'th' ? 'th' : 'ko';
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return lang === 'th' ? `${day} วัน` : `${day}일 전`;
  if (hr >= 1) return lang === 'th' ? `${hr} ชม.` : `${hr}시간 전`;
  if (min >= 1) return lang === 'th' ? `${min} นาที` : `${min}분 전`;
  return lang === 'th' ? 'เมื่อสักครู่' : '방금 전';
}

function ItemRow({ item, locale }: { item: PulseItem; locale: Locale }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      className="tj-pulse-row"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 10,
        textDecoration: 'none',
        color: '#e2e8f0',
        fontSize: 13.5,
        lineHeight: 1.45,
      }}
    >
      <span
        style={{
          minWidth: 0,
          flex: '1 1 auto',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: '#f1f5f9',
          fontWeight: 500,
        }}
      >
        {item.title}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 11,
          color: '#94a3b8',
          display: 'inline-flex',
          gap: 8,
          alignItems: 'baseline',
        }}
      >
        {typeof item.commentCount === 'number' && item.commentCount > 0 ? (
          <span aria-label="comments">
            {locale === 'th' ? '💬' : '댓'} {item.commentCount}
          </span>
        ) : null}
        <time dateTime={item.createdAt ?? undefined}>{relTime(item.createdAt, locale)}</time>
      </span>
    </Link>
  );
}

export function PulseCard({
  col,
  locale,
  variant = 'grid',
}: {
  col: PulseColumn;
  locale: Locale;
  /** grid: 데스크톱 그리드, panel: 모바일 탭 패널(풀폭) */
  variant?: 'grid' | 'panel';
}) {
  const accent = ACCENT_MAP[col.accent];
  const hasItems = col.items.length > 0;

  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: variant === 'grid' ? 'rgba(15,17,40,0.7)' : 'transparent',
    border: variant === 'grid' ? '1px solid rgba(255,255,255,0.08)' : 'none',
    borderRadius: variant === 'grid' ? 16 : 0,
    padding: variant === 'grid' ? 14 : 0,
    boxShadow: variant === 'grid' ? '0 8px 28px rgba(2,6,23,0.35)' : 'none',
  };

  return (
    <article style={cardStyle} className="tj-pulse-card">
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 10,
          paddingInline: 2,
        }}
      >
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: accent.title,
              background: accent.pill,
            }}
          >
            {col.label}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {locale === 'th' ? `วันนี้ ${col.todayCount}` : `오늘 ${col.todayCount}개`}
          </span>
        </div>
        <Link
          href={col.moreHref}
          prefetch={false}
          style={{
            fontSize: 11,
            color: '#c4b5fd',
            textDecoration: 'none',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {locale === 'th' ? 'ทั้งหมด →' : '전체 →'}
        </Link>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {hasItems ? (
          col.items.map((it) => <ItemRow key={it.id} item={it} locale={locale} />)
        ) : (
          <div
            style={{
              padding: '14px 12px 16px',
              fontSize: 12.5,
              color: '#94a3b8',
              lineHeight: 1.55,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed rgba(255,255,255,0.08)',
            }}
          >
            {locale === 'th'
              ? 'กำลังเตรียมเนื้อหา — บอทจะเติมภายในไม่กี่นาที'
              : '파이프라인이 이 카테고리를 채우는 중입니다. 몇 분 뒤 새로고침.'}
          </div>
        )}
      </div>
    </article>
  );
}
