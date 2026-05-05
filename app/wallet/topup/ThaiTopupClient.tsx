'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { THAI_TOPUP_PACKS, type ThaiTopupId } from '@/lib/payments/thaiPackages';
import { requestThaiBalanceRefetch } from '@/lib/thaiBalanceBroadcast';
import { featureFlags } from '@/lib/flags';

const ORDER: ThaiTopupId[] = ['spark', 'monsoon', 'royal_elephant'];

export default function ThaiTopupClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [busy, setBusy] = useState<ThaiTopupId | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const checkout = sp.get('checkout');

  useEffect(() => {
    if (checkout !== 'success') return;
    requestThaiBalanceRefetch();
    router.replace('/wallet/topup', { scroll: false });
  }, [checkout, router]);

  if (!featureFlags.thaiTopupStripeV1) {
    return (
      <div className="page-body board-page mx-auto max-w-lg py-10">
        <p className="text-slate-300">타이 카드 충전은 현재 비활성화되어 있습니다.</p>
        <Link href="/portal" className="mt-4 inline-block text-sky-400 underline">
          포털로
        </Link>
      </div>
    );
  }

  const startTopup = async (packId: ThaiTopupId) => {
    setBusy(packId);
    setMsg(null);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thaiPackage: packId }),
      });
      const j = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !j.checkoutUrl) {
        setMsg(j.error ?? 'checkout_failed');
        return;
      }
      window.location.href = j.checkoutUrl;
    } catch {
      setMsg('network_error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="page-body board-page mx-auto max-w-xl py-8">
      <h1 className="text-xl font-semibold text-slate-100">타이(THAI) 충전</h1>
      <p className="mt-2 text-sm text-slate-400">
        미니홈 스타일 상점 전용 포인트입니다. 카드(Stripe Checkout, THB)로 충전하면 웹훅이 잔액을 반영합니다.
      </p>
      {checkout === 'success' ? (
        <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          결제 세션이 완료되었습니다. 알림함과 잔액이 잠시 후 갱신될 수 있습니다.
        </p>
      ) : null}
      {checkout === 'cancel' ? (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          결제를 취소했습니다. 언제든 다시 시도해 주세요.
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-rose-300">{msg}</p> : null}

      <ul className="mt-8 space-y-4">
        {ORDER.map((id) => {
          const pack = THAI_TOPUP_PACKS[id];
          return (
            <li
              key={id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-slate-100">{pack.label}</div>
                <div className="text-sm text-slate-400">{pack.tagline}</div>
                <div className="mt-1 text-sm text-sky-200">
                  +{pack.thaiCredits.toLocaleString()} 타이 · ฿{pack.amountThb.toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void startTopup(id)}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {busy === id ? 'Stripe 연결 중…' : '카드로 충전'}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href="/minihome/shop" className="text-sky-400 underline">
          살자 상점으로
        </Link>
        <Link href="/premium" className="text-violet-300 underline">
          프리미엄 구독
        </Link>
        <Link href="/portal" className="text-slate-400 underline">
          포털
        </Link>
      </div>
    </div>
  );
}
