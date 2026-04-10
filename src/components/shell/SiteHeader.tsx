'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import type { Dictionary } from '@/i18n/dictionaries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { href: '/', key: 'home' },
  { href: '/tips', key: 'tips' },
  { href: '/local', key: 'local' },
  { href: '/community/boards', key: 'community' },
  { href: '/ilchon', key: 'ilchon' },
  { href: '/minihome', key: 'minihome' },
] as const;

type Props = {
  dict: Pick<Dictionary, 'nav' | 'brandSuffix' | 'logoAria' | 'lang' | 'board'>;
  showAdminConsole?: boolean;
  children?: React.ReactNode;
};

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/tips') return pathname === '/tips' || pathname.startsWith('/tips/');
  if (href === '/community/boards')
    return pathname.startsWith('/community/boards') || pathname.startsWith('/community/trade');
  return pathname.startsWith(href);
}

export function SiteHeader({ dict, showAdminConsole = false, children }: Props) {
  const pathname = usePathname() ?? '/';
  const hideHeaderSearch = pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  const labels: Record<string, string> = {
    home: dict.nav.home,
    tips: dict.nav.tips,
    local: dict.nav.local,
    community: dict.nav.community,
    ilchon: dict.nav.ilchon,
    minihome: dict.nav.memberMinihome,
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top toolbar */}
      <div className="bg-tj-header border-b border-white/10">
        <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-2.5 px-4 py-1.5">
          {children}
          {showAdminConsole && (
            <Link
              href="/admin"
              className={cn(
                'text-xs text-tj-header-muted transition-colors hover:text-white',
                pathname.startsWith('/admin') && 'text-museum-saffron font-semibold'
              )}
            >
              {dict.nav.botConsole}
            </Link>
          )}
        </div>
      </div>

      {/* Nate band - logo + user panel */}
      <div className="border-b-2 border-museum-coral bg-white shadow-md">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-5 sm:py-4">
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-0.5 text-base font-extrabold tracking-tight text-gray-900 no-underline hover:no-underline hover:opacity-90"
            aria-label={dict.logoAria}
          >
            <span className="text-brand-tai">태</span>
            <span>국에 살</span>
            <span className="text-brand-ja">자</span>
            <span className="ml-1 text-[0.78em] font-semibold tracking-wide text-museum-coral">
              {dict.brandSuffix}
            </span>
          </Link>

          {/* Mobile menu trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">메뉴</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-tj-surface">
              <SheetTitle className="mb-4 text-base font-bold">메뉴</SheetTitle>
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2.5 text-sm font-medium no-underline transition-colors',
                      isActive(item.href, pathname)
                        ? 'bg-museum-coral/10 text-museum-coral font-bold'
                        : 'text-tj-muted hover:bg-gray-100 hover:text-tj-ink'
                    )}
                  >
                    {labels[item.key]}
                  </Link>
                ))}
              </nav>
              {showAdminConsole && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 block rounded-md border border-museum-saffron/30 bg-saffron-50 px-3 py-2 text-xs font-semibold text-saffron-700 no-underline"
                >
                  {dict.nav.botConsole}
                </Link>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main nav bar */}
      <nav
        className="bg-tj-header shadow-[0_3px_0_var(--color-museum-saffron),0_8px_24px_rgba(13,13,15,0.35)]"
        aria-label={dict.nav.mainNavAria}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-2 sm:gap-4">
          <div
            className={cn(
              'hidden gap-1 lg:flex',
              hideHeaderSearch && 'flex overflow-x-auto'
            )}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium no-underline transition-colors',
                  isActive(item.href, pathname)
                    ? 'bg-white/15 text-white font-bold'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                )}
              >
                {labels[item.key]}
              </Link>
            ))}
          </div>

          {!hideHeaderSearch && (
            <div className="ml-auto min-w-0 flex-1 max-w-[560px]">
              {/* SiteSearch will be passed as a slot or imported */}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
