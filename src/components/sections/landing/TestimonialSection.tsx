import { StatsBar } from '@/components/ui/landing/StatsBar';
import { DEFAULT_MERGED_LANDING_PAGE_COPY } from '@/lib/landing/landingPageCopyDefaultPayload';
import { pickBilingual } from '@/lib/landing/landingPageCopyShared';
import type { TestimonialSectionCopy } from '@/lib/landing/landingPageCopyTypes';
import type { Locale } from '@/i18n/types';

export function TestimonialSection({
  copy,
  locale,
  degraded,
}: {
  copy?: TestimonialSectionCopy;
  locale: Locale;
  degraded?: boolean;
}) {
  const c = copy ?? DEFAULT_MERGED_LANDING_PAGE_COPY.testimonial;
  return (
    <section
      className="relative z-10"
      style={{
        padding: '52px 0',
        background: 'linear-gradient(180deg, #101125 0%, #0c0e1c 100%)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 'clamp(24px,4.4vw,36px)', fontWeight: 800 }}>{pickBilingual(c.title, locale)}</h2>
        {degraded ? (
          <p className="mt-2 text-xs text-amber-200/80">
            {locale === 'th' ? 'โหลดคำรับรองล้มเหลว — แสดงตัวอย่าง' : '후기 섹션 문구를 DB에서 읽지 못했습니다.'}
          </p>
        ) : null}
        <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
          {c.items.map((testimonial) => (
            <blockquote
              key={testimonial.id}
              style={{
                margin: 0,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.06)',
                padding: 16,
                boxShadow: '0 12px 35px rgba(2,6,23,0.45)',
              }}
            >
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#f1f5f9' }}>{testimonial.quote}</p>
              <cite style={{ marginTop: 10, display: 'block', fontSize: 12, fontWeight: 700, fontStyle: 'normal', color: '#fde68a' }}>{testimonial.author}</cite>
            </blockquote>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <StatsBar />
        </div>
      </div>
    </section>
  );
}
