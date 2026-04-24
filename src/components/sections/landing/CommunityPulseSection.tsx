import { PulseCard } from './pulse/PulseCard';
import { PulseColumnTabs } from './pulse/PulseColumnTabs';
import type { CommunityPulse } from '@/lib/landing/fetchCommunityPulse';
import type { Locale } from '@/i18n/types';

/**
 * Philgo 식 "어디에 뭐가 있는지 한눈" — 태자월드 다크 톤.
 *  - 데스크톱 ≥1024px: 컬럼 수만큼 그리드 (기본 5컬럼)
 *  - 모바일 <1024px: 상단 탭 + 단일 패널 (`<PulseColumnTabs>`)
 *  - 모든 컬럼이 비면 섹션 자체 비노출 (홈이 비어 보이는 것 방지)
 */

type Props = {
  pulse: CommunityPulse;
  locale: Locale;
};

export function CommunityPulseSection({ pulse, locale }: Props) {
  const nonEmpty = pulse.columns.filter((c) => c.items.length > 0);
  if (nonEmpty.length === 0) return null;

  const kicker = 'COMMUNITY PULSE';
  const title = locale === 'th' ? 'ตอนนี้ในชุมชนคุยอะไรกัน' : '지금 광장에서 오가는 이야기';
  const sub =
    locale === 'th'
      ? 'ข่าว · เคล็ดลับ · คำถาม · พูดคุย · ร้านในย่าน — อัปเดตโดยไปป์ไลน์ของแทจะโลก'
      : '뉴스 · 정보 · 질문 · 자유 · 맛집 — 태자월드 파이프라인이 실시간 갱신합니다.';

  const columnCount = Math.min(pulse.columns.length, 5);

  return (
    <section
      aria-labelledby="tj-pulse-title"
      style={{
        marginTop: 40,
        marginBottom: 8,
      }}
    >
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .tj-pulse-grid { display: none; }
            @media (min-width: 1024px) {
              .tj-pulse-grid {
                display: grid;
                gap: 14px;
                grid-template-columns: repeat(${columnCount}, minmax(0, 1fr));
              }
              .tj-pulse-mobile-tabs { display: none; }
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

      {/* 데스크톱 ≥1024px 전용 그리드 */}
      <div className="tj-pulse-grid">
        {pulse.columns.map((col) => (
          <PulseCard key={col.label} col={col} locale={locale} variant="grid" />
        ))}
      </div>

      {/* 모바일 <1024px 전용 탭 */}
      <PulseColumnTabs columns={pulse.columns} locale={locale} />
    </section>
  );
}
