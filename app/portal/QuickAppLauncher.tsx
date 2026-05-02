'use client';

import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type QuickAppDef = {
  id: string;
  href: string;
  emoji: string;
  labelKo: string;
  labelTh: string;
  glow: string;
};

const QUICK_APPS: QuickAppDef[] = [
  {
    id: 'grab',
    href: 'https://www.grab.com/th/',
    emoji: '🛵',
    labelKo: 'Grab',
    labelTh: 'Grab',
    glow: 'rgba(0, 177, 79, 0.55)',
  },
  {
    id: 'baemin',
    href: 'https://www.baemin.com/',
    emoji: '🍜',
    labelKo: '배달K',
    labelTh: 'Baemin',
    glow: 'rgba(0, 199, 190, 0.5)',
  },
  {
    id: 'line',
    href: 'https://line.me/th/',
    emoji: '💬',
    labelKo: 'LINE',
    labelTh: 'LINE',
    glow: 'rgba(6, 199, 85, 0.5)',
  },
  {
    id: 'bolt',
    href: 'https://bolt.eu/th-en/',
    emoji: '⚡',
    labelKo: 'Bolt',
    labelTh: 'Bolt',
    glow: 'rgba(52, 209, 134, 0.45)',
  },
  {
    id: 'foodpanda',
    href: 'https://www.foodpanda.co.th/',
    emoji: '🐼',
    labelKo: 'foodpanda',
    labelTh: 'foodpanda',
    glow: 'rgba(226, 27, 112, 0.45)',
  },
  {
    id: 'shopee',
    href: 'https://shopee.co.th/',
    emoji: '🛍️',
    labelKo: 'Shopee',
    labelTh: 'Shopee',
    glow: 'rgba(238, 77, 45, 0.5)',
  },
];

export default function QuickAppLauncher({ locale }: { locale: Locale }) {
  const copy = getPortal2026Copy(locale);

  return (
    <div className="sticky top-24 z-30 w-full min-w-0 self-start">
      <TooltipProvider delayDuration={180}>
        <nav
          aria-label={copy.quickAppsAria}
          className="rounded-2xl border border-amber-400/18 bg-gradient-to-br from-slate-950/82 via-slate-900/52 to-slate-950/78 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_44px_rgba(0,0,0,0.42),0_0_28px_rgba(251,191,36,0.06)] backdrop-blur-xl [-webkit-backdrop-filter:blur(14px)]"
        >
          <h2 className="sr-only">{copy.quickAppsTitle}</h2>
          <ul className="grid grid-cols-3 gap-2">
            {QUICK_APPS.map((app) => {
              const label = locale === 'th' ? app.labelTh : app.labelKo;
              return (
                <li key={app.id} className="flex justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={app.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="group relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.11)] outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out hover:z-10 hover:scale-110 hover:border-white/22 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_12px_28px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-amber-300/75 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-[3px] rounded-[0.85rem] opacity-[0.38] blur-md transition-opacity duration-200 group-hover:opacity-[0.55]"
                          style={{
                            background: `radial-gradient(circle at 50% 40%, ${app.glow}, transparent 72%)`,
                          }}
                        />
                        <span className="relative select-none text-[1.35rem] leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-out group-hover:scale-[1.06] motion-reduce:group-hover:scale-100">
                          {app.emoji}
                        </span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent
                      hideArrow
                      side="right"
                      sideOffset={8}
                      className="border border-white/12 bg-slate-950/92 px-2.5 py-1.5 text-xs font-semibold text-amber-50 shadow-lg backdrop-blur-md"
                    >
                      {label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>
    </div>
  );
}
