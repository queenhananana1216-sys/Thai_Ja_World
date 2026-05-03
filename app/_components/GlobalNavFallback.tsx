import Link from 'next/link';
import { getClientSiteDisplayName } from '@/lib/site-brand/resolveSiteDisplayName';

/** GlobalNav 예외 시에도 동일한 정적 껍데기 (`GlobalNav` 로고와 일치) */
export function GlobalNavFallback() {
  const brand = getClientSiteDisplayName();
  return (
    <div className="sticky top-0 z-50 w-full shrink-0 border-b border-white/10 bg-[#0B0F19]">
      <div className="site-container flex flex-wrap items-center justify-between gap-2 py-2">
        <Link
          prefetch={true}
          href="/"
          className="inline-flex max-w-[min(100%,22rem)] items-center gap-2.5 no-underline md:gap-3"
          aria-label={`${brand} 홈`}
        >
          <span className="select-none text-[2.35rem] leading-none drop-shadow-[0_2px_14px_rgba(251,191,36,0.45)] md:text-[2.85rem]" aria-hidden>
            🐘
          </span>
          <span className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-slate-900/85 via-slate-900/55 to-amber-950/35 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_28px_rgba(0,0,0,0.35)] backdrop-blur-md md:px-3.5 md:py-2">
            <span
              className="block bg-gradient-to-r from-amber-50 via-amber-300 to-yellow-200 bg-clip-text text-[1.05rem] font-extrabold tracking-tight text-transparent md:text-[1.15rem]"
              style={{ fontFamily: 'var(--tj-brand-nunito), var(--font-noto-kr), system-ui, sans-serif' }}
            >
              {brand}
            </span>
          </span>
        </Link>
        <div className="flex gap-2">
          <Link
            prefetch={true}
            href="/auth/login?next=%2F"
            className="rounded-full border border-violet-400/40 px-3 py-1 text-xs font-bold text-violet-100 no-underline"
          >
            로그인
          </Link>
          <Link
            prefetch={true}
            href="/auth/signup?next=%2F"
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-bold text-slate-100 no-underline"
          >
            회원가입
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 pb-2">
        <input
          readOnly
          tabIndex={-1}
          placeholder="통합 검색"
          className="w-full max-w-md rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300"
        />
      </div>
    </div>
  );
}
