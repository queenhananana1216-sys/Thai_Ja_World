import { StatsBar } from '@/components/ui/landing/StatsBar';
import { LANDING_TESTIMONIALS } from '@/lib/landing/constants';

export function TestimonialSection() {
  return (
    <section style={{ padding: '52px 0' }}>
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
