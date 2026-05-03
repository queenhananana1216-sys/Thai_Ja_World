'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';
import { TJ_THAI_BALANCE_REFETCH } from '@/lib/thaiBalanceBroadcast';
import ThaiOdometerNumber from './ThaiOdometerNumber';

const NAV_ITEMS = [
  { href: '/', label: '홈', icon: '🏠' },
  { href: '/community/boards', label: '커뮤니티', icon: '💬' },
  { href: '/local', label: '로컬 QR', icon: '🏬' },
  { href: '/korean-biz', label: '한인 생활망', icon: '🛒' },
  { href: '/minihome', label: '내 미니홈', icon: '👤' },
] as const;

function linkIsActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/community/boards') {
    return pathname === '/community' || pathname.startsWith('/community/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function numberLocaleFromHtmlLang(): string {
  if (typeof document === 'undefined') return 'ko-KR';
  const lang = document.documentElement.lang?.trim().toLowerCase() ?? 'ko';
  if (lang.startsWith('th')) return 'th-TH';
  return 'ko-KR';
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? '';
  const sb = useMemo(() => createBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [numLocale, setNumLocale] = useState('ko-KR');

  const pull = useCallback(async () => {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.id) {
      setUserId(null);
      setBalance(null);
      return;
    }
    setUserId(user.id);
    const { data, error } = await sb.from('profiles').select('thai_balance').eq('id', user.id).maybeSingle();
    if (error || !data) return;
    const b = (data as { thai_balance?: unknown }).thai_balance;
    if (typeof b === 'number' && Number.isFinite(b)) {
      setBalance(Math.max(0, Math.floor(b)));
    }
  }, [sb]);

  useEffect(() => {
    setNumLocale(numberLocaleFromHtmlLang());
  }, [pathname]);

  useEffect(() => {
    void pull();
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => void pull());
    return () => subscription.unsubscribe();
  }, [pull, sb.auth]);

  useEffect(() => {
    const onRefetch = () => void pull();
    window.addEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
    return () => window.removeEventListener(TJ_THAI_BALANCE_REFETCH, onRefetch);
  }, [pull]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull();
    }, 22_000);
    return () => window.clearInterval(iv);
  }, [pull]);

  const suffix = numLocale.startsWith('th') ? 'THAI' : '타이';

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {userId && balance != null ? (
        <div className="border-t border-cyan-500/20 bg-slate-950/95 px-2 py-1.5 text-center backdrop-blur-xl">
          <span
            className="inline-flex items-center justify-center gap-1 text-[11px] font-extrabold tabular-nums text-cyan-100"
            title={suffix === 'THAI' ? 'THAI balance' : '보유 타이(THAI)'}
          >
            <span aria-hidden>฿</span>
            <ThaiOdometerNumber value={balance} locale={numLocale} className="tracking-tight" />
            <span className="font-bold text-cyan-50/95">{suffix}</span>
          </span>
        </div>
      ) : null}
      <nav
        aria-label="모바일 하단 메뉴"
        className="w-full border-t border-slate-800/90 bg-slate-950/85 backdrop-blur-xl"
      >
        <div className="flex w-full items-stretch justify-around gap-0 px-1 pt-2 pb-2">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = linkIsActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 max-w-[20%] flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1 text-center text-[10px] font-semibold leading-tight transition-colors',
                  active ? 'text-emerald-400' : 'text-gray-400 active:text-gray-200',
                )}
              >
                <span className="text-[1.125rem] leading-none select-none" aria-hidden>
                  {icon}
                </span>
                <span className="line-clamp-2 w-full break-keep">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
