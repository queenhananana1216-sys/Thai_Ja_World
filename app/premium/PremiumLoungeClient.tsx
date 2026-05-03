'use client';

import { motion } from 'framer-motion';
import { Crown, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { PremiumPlanId } from '@/lib/payments/premiumPlans';
import { PREMIUM_PLAN_IDS, PREMIUM_PLANS } from '@/lib/payments/premiumPlans';
import { featureFlags } from '@/lib/flags';
import { cn } from '@/lib/utils';

const PLAN_ICONS: Record<PremiumPlanId, typeof Sparkles> = {
  basic: Sparkles,
  pro: Zap,
  sponsor: Crown,
};

export default function PremiumLoungeClient({
  viewerId,
  initialIsPremium,
  initialPlan,
}: {
  viewerId: string | null;
  initialIsPremium: boolean;
  initialPlan: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout = searchParams.get('checkout');
  const [busy, setBusy] = useState<PremiumPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const premiumEnabled = featureFlags.premiumSubscriptionsV1;

  const checkoutBanner = useMemo(() => {
    if (checkout === 'success') {
      return {
        tone: 'ok' as const,
        text: '결제 세션이 완료되었습니다. Stripe 웹훅이 프로필을 갱신할 때까지 수 초~1분 정도 걸릴 수 있습니다.',
      };
    }
    if (checkout === 'cancel') {
      return {
        tone: 'warn' as const,
        text: '결제를 취소했습니다. 언제든지 다시 구독을 시작할 수 있습니다.',
      };
    }
    return null;
  }, [checkout]);

  const startCheckout = useCallback(
    async (planId: PremiumPlanId) => {
      setError(null);
      if (!viewerId) return;
      if (!premiumEnabled) {
        setError('프리미엄 구독 기능이 비활성화되어 있습니다.');
        return;
      }
      setBusy(planId);
      try {
        const res = await fetch('/api/payments/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ premiumPlan: planId }),
        });
        const data = (await res.json()) as { checkoutUrl?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? `checkout_failed:${res.status}`);
          return;
        }
        const url = data.checkoutUrl;
        if (url) window.location.href = url;
        else setError('checkout_url_missing');
      } catch {
        setError('network_error');
      } finally {
        setBusy(null);
      }
    },
    [viewerId, premiumEnabled],
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050508] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(56,189,248,0.12), transparent 50%), radial-gradient(ellipse 50% 35% at 0% 80%, rgba(251,191,36,0.08), transparent 45%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2248%22%20height=%2248%22%20viewBox=%220%200%2048%2048%22%3E%3Cpath%20fill=%22%23ffffff%22%20fill-opacity=%220.03%22%20d=%22M0%200h24v24H0zm24%2024h24v24H24z%22/%3E%3C/svg%3E')] opacity-40" />

      <header className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pb-10 pt-14 text-center md:pt-20">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-violet-300/90"
        >
          Thai Ja World · Premium Lounge
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="max-w-3xl bg-gradient-to-br from-white via-violet-100 to-fuchsia-200/90 bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-5xl"
        >
          태국에, 살자 프리미엄 라운지
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base"
        >
          스폰서 배너·광고 없는 미니홈 등 상위 티어 혜택을 월 구독으로 바로 연결합니다. 테스트 모드에서는 Stripe Test 카드로 즉시 플로우를 검증할 수
          있습니다.
        </motion.p>

        {initialIsPremium ? (
          <div className="mt-6 rounded-full border border-amber-400/35 bg-amber-500/10 px-5 py-2 text-xs font-semibold text-amber-100 backdrop-blur-md">
            현재 프리미엄 회원입니다
            {initialPlan ? (
              <span className="ml-2 text-amber-200/80">({initialPlan})</span>
            ) : null}
          </div>
        ) : null}

        {checkoutBanner ? (
          <div
            className={cn(
              'mt-6 max-w-xl rounded-2xl border px-4 py-3 text-left text-xs leading-relaxed backdrop-blur-xl md:text-sm',
              checkoutBanner.tone === 'ok'
                ? 'border-emerald-400/30 bg-emerald-950/40 text-emerald-50'
                : 'border-amber-400/30 bg-amber-950/35 text-amber-50',
            )}
          >
            {checkoutBanner.text}
            {checkoutBanner.tone === 'ok' ? (
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-2 block text-[11px] font-bold underline underline-offset-2 hover:text-white"
              >
                상태 새로고침
              </button>
            ) : null}
          </div>
        ) : null}

        {!premiumEnabled ? (
          <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-2 text-xs text-rose-100">
            <code className="mr-1 rounded bg-black/30 px-1">NEXT_PUBLIC_FF_PREMIUM_SUBSCRIPTIONS_V1</code>
            가 꺼져 있어 프리미엄 결제가 비활성화된 상태입니다.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 max-w-lg rounded-xl border border-rose-500/35 bg-rose-950/40 px-4 py-2 text-xs text-rose-50">
            {error}
          </p>
        ) : null}
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 pb-24 md:grid-cols-3">
        {PREMIUM_PLAN_IDS.map((id, index) => {
          const plan = PREMIUM_PLANS[id];
          const Icon = PLAN_ICONS[id];
          const popular = id === 'pro';
          return (
            <motion.article
              key={id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className={cn(
                'relative flex flex-col rounded-3xl p-[1px] shadow-[0_24px_80px_rgba(0,0,0,0.55)]',
                popular
                  ? 'bg-gradient-to-b from-violet-400/70 via-fuchsia-500/40 to-cyan-400/50 md:scale-[1.02] md:-translate-y-1'
                  : 'bg-gradient-to-b from-white/25 via-white/10 to-white/5',
              )}
            >
              {popular ? (
                <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-violet-400/40 bg-violet-950/90 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-100 shadow-lg backdrop-blur-md">
                  Most picked
                </span>
              ) : null}
              <div className="flex h-full flex-col rounded-[calc(1.5rem-1px)] border border-white/10 bg-slate-950/75 px-6 pb-7 pt-8 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-inner"
                    style={{ color: plan.accent }}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{plan.label}</h2>
                    <p className="text-xs font-medium text-slate-500">월 구독 · 자동 갱신</p>
                  </div>
                </div>
                <p className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">{plan.priceLabel}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{plan.blurb}</p>
                <ul className="mt-5 flex flex-col gap-2 text-sm text-slate-300">
                  {plan.highlights.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/90" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  {viewerId ? (
                    <button
                      type="button"
                      disabled={Boolean(busy) || !premiumEnabled}
                      onClick={() => void startCheckout(id)}
                      className={cn(
                        'w-full rounded-2xl py-3.5 text-sm font-black transition disabled:opacity-40',
                        popular
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-900/40 hover:brightness-110'
                          : 'border border-white/15 bg-white/[0.07] text-white hover:bg-white/12',
                      )}
                    >
                      {busy === id ? 'Stripe로 연결 중…' : `${plan.label} 구독하기`}
                    </button>
                  ) : (
                    <Link
                      href={`/auth/login?next=${encodeURIComponent('/premium')}`}
                      className={cn(
                        'flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-black no-underline transition',
                        popular
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg hover:brightness-110'
                          : 'border border-white/15 bg-white/[0.07] text-white hover:bg-white/12',
                      )}
                    >
                      로그인 후 구독
                    </Link>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </main>

      <footer className="relative z-10 mx-auto max-w-3xl px-4 pb-16 text-center text-[11px] leading-relaxed text-slate-500">
        <p>
          결제는 <strong className="text-slate-400">Stripe Checkout</strong>으로 처리됩니다. 서버 환경변수{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">STRIPE_SECRET_KEY</code>,{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">STRIPE_WEBHOOK_SECRET</code> 및 웹훅 URL{' '}
          <code className="rounded bg-white/5 px-1 py-0.5 text-slate-400">/api/webhooks/stripe</code>
          를 설정해야 프로필 프리미엄 상태가 자동 반영됩니다.
        </p>
        <p className="mt-3">
          <Link href="/" className="text-violet-400/90 underline-offset-2 hover:underline">
            ← 홈으로
          </Link>
        </p>
      </footer>
    </div>
  );
}
