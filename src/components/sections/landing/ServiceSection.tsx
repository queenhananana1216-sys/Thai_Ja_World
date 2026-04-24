import { ExchangeRateFloat } from '@/components/ui/landing/ExchangeRateFloat';
import { LANDING_FEATURES } from '@/lib/landing/constants';
import { portWidgetCard, portWidgetHeaderSub, portWidgetHeaderTitle } from '@/lib/landing/portalWidgetStyle';

type LegacyProps = { variant?: 'legacy' };
type PortalProps = { variant: 'portal'; serviceHub: { title: string; sub: string } };
type Props = LegacyProps | PortalProps;

function isPortal(p: Props): p is PortalProps {
  return p.variant === 'portal';
}

export function ServiceSection(props: Props) {
  if (isPortal(props)) {
    const { serviceHub } = props;
    return (
      <section className="bg-slate-100/50 py-8" data-variant="service-portal">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <h2 className="m-0 text-sm font-extrabold text-slate-800 sm:text-base">{serviceHub.title}</h2>
          <p className="mt-1.5 m-0 text-xs text-slate-500">{serviceHub.sub}</p>
          <div className="mt-2">
            <ExchangeRateFloat />
          </div>
          <ul className="m-0 mt-3 list-none space-y-2.5 p-0 sm:mt-4">
            {LANDING_FEATURES.map((feature) => (
              <li
                key={feature.id}
                className={portWidgetCard + ' p-3.5 sm:p-4'}
                style={{ listStyle: 'none' }}
              >
                <p className="m-0 text-[11px] text-violet-700 sm:text-xs">{feature.icon}</p>
                <h3 className={portWidgetHeaderTitle + ' mt-0.5'}>{feature.title}</h3>
                <p className={portWidgetHeaderSub + ' mt-1.5 m-0'}>{feature.description}</p>
                <ul className="m-0 mt-2.5 list-none space-y-1.5 p-0 text-xs text-slate-600 sm:space-y-2 sm:text-[0.8125rem]">
                  {feature.bullets.map((b) => (
                    <li
                      key={b}
                      className="rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-1.5 leading-relaxed"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  return (
    <section
      style={{
        padding: '52px 0',
        background: 'linear-gradient(180deg,#080a1a 0%,#120f2d 100%)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px,4.4vw,36px)', lineHeight: 1.2, fontWeight: 800 }}>태자월드에서 바로 쓸 수 있는 것들</h2>
          <p style={{ margin: 0, borderRadius: 999, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', padding: '6px 10px', fontSize: 12, color: '#cbd5e1' }}>
            새 기능은 배열에 항목을 추가하면 섹션이 자동 확장됩니다.
          </p>
        </div>
        <ExchangeRateFloat />
        <div style={{ position: 'relative', marginTop: 16, display: 'grid', gap: 12 }}>
          {LANDING_FEATURES.map((feature) => (
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
              <ul style={{ margin: '12px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8, fontSize: 14, color: '#cbd5e1', listStyle: 'none', padding: 0 }}>
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
