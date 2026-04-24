import { ExchangeRateFloat } from '@/components/ui/landing/ExchangeRateFloat';
import { DEFAULT_MERGED_LANDING_PAGE_COPY } from '@/lib/landing/landingPageCopyDefaultPayload';
import { pickBilingual } from '@/lib/landing/landingPageCopyShared';
import type { ServiceSectionCopy } from '@/lib/landing/landingPageCopyTypes';
import type { Locale } from '@/i18n/types';

export function ServiceSection({
  copy,
  locale,
  degraded,
}: {
  copy?: ServiceSectionCopy;
  locale: Locale;
  degraded?: boolean;
}) {
  const c = copy ?? DEFAULT_MERGED_LANDING_PAGE_COPY.service;
  return (
    <section
      className="relative z-10"
      style={{
        padding: '52px 0',
        background: 'linear-gradient(180deg,#080a1a 0%,#120f2d 100%)',
        color: '#e2e8f0',
      }}
    >
      <div className="mx-auto max-w-[1180px] px-4">
        <div className="mb-[18px] flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <h2 className="min-w-0 break-words text-[clamp(1.5rem,4.4vw,2.25rem)] font-extrabold leading-tight">
            {pickBilingual(c.title, locale)}
          </h2>
          <p className="m-0 w-full max-w-full rounded-xl border border-white/20 bg-white/[0.06] px-3 py-2 text-xs leading-relaxed text-slate-300 sm:max-w-[min(100%,30rem)] sm:shrink-0">
            {pickBilingual(c.subtitle, locale)}
            {degraded ? (
              <span className="mt-1.5 block text-amber-100/95">
                {locale === 'th' ? ' (แสดงค่าเริ่มต้น — DB ล้มเหลว)' : ' (DB 연결 실패 — 기본 문구 표시)'}
              </span>
            ) : null}
          </p>
        </div>
        <ExchangeRateFloat />
        <div style={{ position: 'relative', marginTop: 16, display: 'grid', gap: 12 }}>
          {c.features.map((feature) => (
            <article
              key={feature.id}
              style={{
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.04)',
                padding: 16,
                boxShadow: '0 14px 45px rgba(2,6,23,0.5)',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: '#ddd6fe' }}>{feature.icon}</p>
              <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{feature.title}</h3>
              <p style={{ margin: '10px 0 0', fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>{feature.description}</p>
              <ul
                className="mt-3"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))',
                  gap: 8,
                  fontSize: 14,
                  color: '#cbd5e1',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                {feature.bullets.map((bullet) => (
                  <li key={bullet} style={{ borderRadius: 10, border: '1px solid rgba(71,85,105,0.7)', background: 'rgba(15,23,42,0.7)', padding: '8px 10px', lineHeight: 1.5 }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
