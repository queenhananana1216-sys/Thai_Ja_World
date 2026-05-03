'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { TJ_THAI_BALANCE_REFETCH } from '@/lib/thaiBalanceBroadcast';
import ThaiOdometerNumber from './ThaiOdometerNumber';
import type { Locale } from '@/i18n/types';

type Props = {
  locale: Locale;
  initialBalance: number | null;
};

/** 포털 퀵 메뉴 상단 — SSR 초깃값 + 전역 refetch 시 오도미터 갱신 */
export default function ThaiQuickWalletStrip({ locale, initialBalance }: Props) {
  const sb = useMemo(() => createBrowserClient(), []);
  const numberLocale = locale === 'th' ? 'th-TH' : 'ko-KR';
  const suffix = locale === 'th' ? 'THAI' : '타이';

  const [balance, setBalance] = useState<number | null>(() =>
    typeof initialBalance === 'number' && Number.isFinite(initialBalance)
      ? Math.max(0, Math.floor(initialBalance))
      : null,
  );

  const pull = useCallback(async () => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.id) {
      setBalance(null);
      return;
    }
    const { data, error } = await sb.from('profiles').select('thai_balance').eq('id', user.id).maybeSingle();
    if (error || !data) return;
    const b = (data as { thai_balance?: unknown }).thai_balance;
    if (typeof b === 'number' && Number.isFinite(b)) {
      setBalance(Math.max(0, Math.floor(b)));
    }
  }, [sb]);

  useEffect(() => {
    if (typeof initialBalance === 'number' && Number.isFinite(initialBalance)) {
      setBalance(Math.max(0, Math.floor(initialBalance)));
    }
  }, [initialBalance]);

  useEffect(() => {
    void pull();
  }, [pull]);

  useEffect(() => {
    const onRefetch = () => void pull();
    window.addEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
    return () => window.removeEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
  }, [pull]);

  useEffect(() => {
    const iv = window.setInterval(
      () => {
        if (document.visibilityState === 'visible') void pull();
      },
      22_000,
    );
    return () => window.clearInterval(iv);
  }, [pull]);

  if (balance == null) return null;

  return (
    <div className="mb-2 flex justify-center md:mb-2.5">
      <span
        className="inline-flex max-w-full items-center gap-1.5 rounded-full border-[0.5px] border-cyan-400/35 bg-gradient-to-r from-indigo-950/85 via-slate-950/90 to-cyan-950/55 px-3 py-1.5 text-sm font-extrabold tabular-nums text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_28px_rgba(34,211,238,0.12)] backdrop-blur-xl"
        title={locale === 'th' ? 'THAI balance' : '보유 타이(THAI)'}
      >
        <span aria-hidden>฿</span>
        <span className="min-w-0 truncate">
          <ThaiOdometerNumber value={balance} locale={numberLocale} /> {suffix}
        </span>
      </span>
    </div>
  );
}
