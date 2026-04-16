import { StatsBar } from '@/components/ui/landing/StatsBar';
import { LANDING_TESTIMONIALS } from '@/lib/landing/constants';

export function TestimonialSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">실제 교민들이 남긴 이야기</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {LANDING_TESTIMONIALS.map((testimonial) => (
            <blockquote
              key={testimonial.id}
              className="rounded-3xl border border-white/15 bg-white/5 p-6 shadow-[0_12px_35px_rgba(2,6,23,0.45)] backdrop-blur-xl"
            >
              <p className="text-sm leading-relaxed text-slate-100">{testimonial.quote}</p>
              <cite className="mt-4 block text-xs font-semibold not-italic text-amber-200">{testimonial.author}</cite>
            </blockquote>
          ))}
        </div>

        <div className="mt-12">
          <StatsBar />
        </div>
      </div>
    </section>
  );
}
