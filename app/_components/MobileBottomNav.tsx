'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

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

export default function MobileBottomNav() {
  const pathname = usePathname() ?? '';

  return (
    <nav
      aria-label="모바일 하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-50 w-full bg-gray-900/80 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex w-full items-stretch justify-around gap-0 border-t border-gray-800 px-1 pt-2 pb-2">
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
                active ? 'text-amber-400' : 'text-gray-400 active:text-gray-200',
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
  );
}
