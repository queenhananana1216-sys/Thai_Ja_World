import Link from 'next/link';
import { DEFAULT_SITE_DISPLAY_NAME } from '@/lib/site-brand/constants';

/** SiteFooter 예외 시 — 최소 링크만 (컨텍스트 불필요) */
export function SiteFooterFallback({ siteDisplayName }: { siteDisplayName: string }) {
  const brand = siteDisplayName.trim() || DEFAULT_SITE_DISPLAY_NAME;
  return (
    <footer className="border-t border-white/10 bg-[#060814] px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] text-center text-[11px] text-slate-500 md:pb-6">
      <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2" aria-label="약관·안내">
        <Link prefetch={true} href="/terms" className="text-slate-400 no-underline hover:text-white hover:underline">
          이용약관
        </Link>
        <Link prefetch={true} href="/privacy" className="text-slate-400 no-underline hover:text-white hover:underline">
          개인정보
        </Link>
        <Link prefetch={true} href="/contact" className="text-slate-400 no-underline hover:text-white hover:underline">
          문의
        </Link>
      </nav>
      <p className="m-0">&copy; {new Date().getFullYear()} {brand}</p>
    </footer>
  );
}
