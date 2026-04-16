import { ExchangeRateFloat } from '@/components/ui/landing/ExchangeRateFloat';
import { LANDING_FEATURES } from '@/lib/landing/constants';

export function ServiceSection() {
  return (
    <section className="bg-[linear-gradient(180deg,#080a1a_0%,#120f2d_100%)] py-24 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold sm:text-4xl">태자월드에서 바로 쓸 수 있는 것들</h2>
          <p className="hidden rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-slate-300 md:block">
            새 기능은 배열에 항목을 추가하면 섹션이 자동 확장됩니다.
          </p>
        </div>
        <ExchangeRateFloat />
        <div className="relative mt-6 space-y-6 border-l border-slate-600/70 pl-5">
          {LANDING_FEATURES.map((feature) => (
            <article
              key={feature.id}
              className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_14px_45px_rgba(2,6,23,0.5)] transition hover:border-violet-300/40 hover:bg-white/[0.05]"
            >
              <p className="text-sm text-violet-200">{feature.icon}</p>
              <h3 className="mt-2 text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 text-sm text-slate-300">{feature.description}</p>
              <ul className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2">
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
