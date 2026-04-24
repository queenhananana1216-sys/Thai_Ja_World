import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { CommunityPulse, PulseColumn, PulseItem } from '@/lib/landing/fetchCommunityPulse';
import type { Locale } from '@/i18n/types';

/**
 * Philgo 처럼 "어디에 뭐가 있는지 한눈에" — 태자월드 다크 톤으로.
 * 뉴스 · 정보 · 자유토론 · 질문답변 · 동네맛집 5개 컬럼.
 *
 * - 모든 컬럼이 비었으면 섹션 자체를 렌더하지 않는다 (홈이 비어 보이는 일 방지).
 * - 한 컬럼만 비면 해당 컬럼에 "파이프라인 준비 중" 플레이스홀더.
 */

type Props = {
  pulse: CommunityPulse;
  locale: Locale;
};

const ACCENT_MAP: Record<PulseColumn['accent'], { pill: string; title: string }> = {
  lavender: { pill: 'rgba(196,181,253,0.18)', title: '#c4b5fd' },
  pink: { pill: 'rgba(249,168,212,0.18)', title: '#fbcfe8' },
  amber: { pill: 'rgba(251,191,36,0.18)', title: '#fde68a' },
  sky: { pill: 'rgba(125,211,252,0.18)', title: '#bae6fd' },
  lime: { pill: 'rgba(190,242,100,0.18)', title: '#d9f99d' },
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
  if (day >= 1) return lang === 'th' ? `${day}\u00a0วัน` : `${day}일 전`;
  if (hr >= 1) return lang === 'th' ? `${hr}\u00a0ชม.` : `${hr}시간 전`;
  if (min >= 1) return lang === 'th' ? `${min}\u00a0นาที` : `${min}분 전`;
  return lang === 'th' ? 'เมื่อสักครู่' : '방금 전';
}

function ItemRow({ item, locale }: { item: PulseItem; locale: Locale }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
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
      className="tj-pulse-row"
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
          <span aria-label="comments">{locale === 'th' ? '💬' : '댓'}{' '}{item.commentCount}</span>
        ) : null}
        <time dateTime={item.createdAt ?? undefined}>{relTime(item.createdAt, locale)}</time>
      </span>
    </Link>
  );
}

function ColumnCard({ col, locale }: { col: PulseColumn; locale: Locale }) {
  const accent = ACCENT_MAP[col.accent];
  const hasItems = col.items.length > 0;

  const cardStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: 'rgba(15,17,40,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    boxShadow: '0 8px 28px rgba(2,6,23,0.35)',
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

export function CommunityPulseSection({ pulse, locale }: Props) {
  const nonEmptyColumns = pulse.columns.filter((c) => c.items.length > 0);
  if (nonEmptyColumns.length === 0) return null;

  const kicker = locale === 'th' ? 'COMMUNITY PULSE' : 'COMMUNITY PULSE';
  const title = locale === 'th' ? 'ตอนนี้ในชุมชนคุยอะไรกัน' : '지금 광장에서 오가는 이야기';
  const sub =
    locale === 'th'
      ? 'ข่าว · เคล็ดลับ · คำถาม · ร้านในย่าน — อัปเดตทุกไม่กี่นาทีโดยไปป์ไลน์ของแทจะโลก'
      : '뉴스 · 정보 · 질문 · 자유 · 맛집 — 태자월드 파이프라인이 몇 분마다 갱신합니다.';

  return (
    <section
      aria-labelledby="tj-pulse-title"
      style={{
        marginTop: 40,
        marginBottom: 8,
      }}
    >
      {/* 섹션 헤더 */}
      <div style={{ textAlign: 'left', marginBottom: 18 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.12em',
            fontWeight: 700,
            color: '#f9a8d4',
            textTransform: 'uppercase',
          }}
        >
          {kicker}
        </p>
        <h2
          id="tj-pulse-title"
          style={{
            margin: '6px 0 4px',
            fontSize: 26,
            lineHeight: 1.25,
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          {title}
        </h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{sub}</p>
      </div>

      {/* 그리드: 기본 1열, md≥ 2열, lg≥ 5열(컬럼 수만큼 flexible) */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .tj-pulse-grid {
              display: grid;
              gap: 14px;
              grid-template-columns: minmax(0, 1fr);
            }
            @media (min-width: 640px) {
              .tj-pulse-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (min-width: 1024px) {
              .tj-pulse-grid { grid-template-columns: repeat(${Math.min(
                pulse.columns.length,
                5,
              )}, minmax(0, 1fr)); }
            }
            .tj-pulse-row:hover { background: rgba(255,255,255,0.06); }
            .tj-pulse-row:focus-visible {
              outline: 2px solid #c4b5fd;
              outline-offset: 2px;
              background: rgba(255,255,255,0.06);
            }
          `,
        }}
      />

      <div className="tj-pulse-grid">
        {pulse.columns.map((col) => (
          <ColumnCard key={col.label} col={col} locale={locale} />
        ))}
      </div>
    </section>
  );
}
