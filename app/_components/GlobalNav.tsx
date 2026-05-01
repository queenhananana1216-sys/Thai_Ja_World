'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';
import { useGlobalLanguage } from '@/contexts/GlobalLanguageContext';
import AuthBar from './AuthBar';
import GlobalNavSearchIsland from './GlobalNavSearchIsland';

const WRITE_HREF = '/community/write';

function navItemsFor(dict: Dictionary, loc: Locale): { href: string; label: string }[] {
  const th = loc === 'th';
  return [
    { href: '/', label: dict.nav.home },
    { href: '/community/boards', label: dict.home.hubBoard },
    { href: '/community/boards?cat=flea', label: th ? 'ตลาดนัด' : '번개장터' },
    { href: '/community/boards?cat=job', label: th ? 'หางาน' : '구인구직' },
    { href: '/local/info', label: th ? 'อสังหาริมทรัพย์' : '부동산' },
    { href: '/local', label: dict.nav.local },
    { href: '/news', label: th ? 'ข่าว' : '뉴스' },
  ];
}

export default function GlobalNav() {
  const { locale, dict, setLocale } = useGlobalLanguage();
  const router = useRouter();
  const menus = useMemo(() => navItemsFor(dict, locale), [dict, locale]);

  async function onSelectLocale(next: 'ko' | 'th') {
    try {
      const ok = await setLocale(next);
      if (ok) router.refresh();
    } catch {
      /* language chrome stays visible */
    }
  }

  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="border-b border-white/5 bg-slate-950/80">
        <div className="site-container flex flex-wrap items-center justify-between gap-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => void onSelectLocale('ko')}
              className={
                'rounded border px-1.5 py-0.5 transition-colors ' +
                (locale === 'ko'
                  ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                  : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200')
              }
              aria-pressed={locale === 'ko'}
            >
              {dict.lang.ko}
            </button>
            <span className="text-slate-600">/</span>
            <button
              type="button"
              onClick={() => void onSelectLocale('th')}
              className={
                'rounded border px-1.5 py-0.5 transition-colors ' +
                (locale === 'th'
                  ? 'border-amber-400/50 bg-amber-500/10 text-amber-100'
                  : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200')
              }
              aria-pressed={locale === 'th'}
            >
              {dict.lang.th}
            </button>
          </div>
          <AuthBar loginLabel={dict.board.login} signupLabel={dict.board.signup} />
        </div>
      </div>

      <div className="site-container flex flex-wrap items-center justify-between gap-3 py-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 no-underline"
          aria-label={dict.logoAria}
        >
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/35 bg-gradient-to-br from-violet-600/40 to-slate-900 text-lg font-black text-white shadow-inner md:h-11 md:w-11"
            aria-hidden
          >
            태
          </span>
          <span className="text-base font-black tracking-tight text-white md:text-lg">
            태자<span className="text-amber-300">월드</span>
          </span>
          <span className="sr-only">{dict.brandSuffix}</span>
        </Link>

        <div className="order-3 w-full min-w-0 max-w-xl flex-1 md:order-none md:w-auto md:max-w-md">
          <GlobalNavSearchIsland dict={dict} />
        </div>
      </div>

      <nav
        className="border-t border-white/5 bg-gradient-to-b from-slate-950/90 to-slate-900/95 py-2"
        aria-label={dict.nav.mainNavAria}
      >
        <div className="site-container flex flex-col gap-2">
          <details className="group md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-200 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="after:ml-2 after:text-slate-500 after:content-['▾']">메뉴</span>
            </summary>
            <div className="mt-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-slate-950/95 p-2">
              <Link
                href="/auth/login?next=%2F"
                className="rounded-md border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-center text-sm font-semibold text-violet-100 no-underline"
              >
                {dict.board.login}
              </Link>
              <Link
                href="/auth/signup?next=%2F"
                className="rounded-md border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-center text-sm font-semibold text-pink-100 no-underline"
              >
                {dict.board.signup}
              </Link>
              <Link
                href={WRITE_HREF}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white no-underline"
              >
                ✎ {dict.board.newPost}
              </Link>
              {menus.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-md px-3 py-2 text-sm text-slate-200 no-underline hover:bg-slate-800"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </details>

          <div className="hidden flex-wrap items-center gap-2 md:flex">
            {menus.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-200 no-underline hover:border-amber-400/40 hover:text-amber-200"
              >
                {m.label}
              </Link>
            ))}
            <Link
              href={WRITE_HREF}
              className="ml-auto rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white no-underline shadow-md hover:bg-blue-500"
            >
              ✎ {dict.board.newPost}
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
