import { StatsBar } from '@/components/ui/landing/StatsBar';
import { LANDING_TESTIMONIALS } from '@/lib/landing/constants';
import { portWidgetCard, portWidgetHeaderSub, portWidgetHeaderTitle } from '@/lib/landing/portalWidgetStyle';

type Props = { variant?: 'legacy' | 'portal' };

export function TestimonialSection({ variant = 'legacy' }: Props) {
  if (variant === 'portal') {
    return (
      <section className="border-t border-slate-200/80 bg-slate-100/30 py-8" data-variant="testimonial-portal">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <h2 className={portWidgetHeaderTitle + ' m-0 sm:text-base'}>실제 교민들이 남긴 이야기</h2>
          <p className={portWidgetHeaderSub + ' mt-1 m-0'}>새 글·댓글이 쌓이는지 숫자로도 확인해 보세요.</p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            {LANDING_TESTIMONIALS.map((testimonial) => (
              <blockquote key={testimonial.id} className={portWidgetCard + ' m-0 p-3.5 sm:p-4'}>
                <p className="m-0 text-xs leading-relaxed text-slate-700 sm:text-[0.8125rem]">{testimonial.quote}</p>
                <cite className="mt-2 block text-[11px] font-bold not-italic text-violet-800">{testimonial.author}</cite>
              </blockquote>
            ))}
          </div>
          <div className="mt-4">
            <StatsBar />
          </div>
        </div>
      </section>
    );
  }
  return (
    <section
      style={{
        padding: '52px 0',
        background: 'linear-gradient(180deg, #101125 0%, #0c0e1c 100%)',
        color: '#e2e8f0',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px' }}>
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: 'clamp(24px,4.4vw,36px)', fontWeight: 800 }}>실제 교민들이 남긴 이야기</h2>
        <div style={{ marginTop: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
          {LANDING_TESTIMONIALS.map((testimonial) => (
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
