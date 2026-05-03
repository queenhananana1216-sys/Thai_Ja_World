'use client';

import type { Locale } from '@/i18n/types';
import { getPortal2026Copy } from '@/i18n/portal2026Copy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReactNode } from 'react';

type QuickAppDef = {
  id: string;
  href: string;
  labelKo: string;
  labelTh: string;
  /** Tailwind classes for icon tile background */
  tileClassName: string;
  icon: ReactNode;
};

/** Grab 타일 — 흰색 ‘G’ 링 + 안쪽 가로획 */
function IconGrab({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M17 7.55A5.05 5.05 0 1 0 17 16.45"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M17 12.38H12.85" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

/** 흰색 판다 실루엣 + 어두운 눈·코 (마젠타 배경 위 대비) */
function IconFoodpanda({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <ellipse cx="12" cy="14.2" rx="6.4" ry="5.6" fill="currentColor" />
      <ellipse cx="8.1" cy="7.8" rx="2.9" ry="2.3" fill="currentColor" />
      <ellipse cx="15.9" cy="7.8" rx="2.9" ry="2.3" fill="currentColor" />
      <circle cx="9.3" cy="12.6" r="1.25" fill="#2D0A18" />
      <circle cx="14.7" cy="12.6" r="1.25" fill="#2D0A18" />
      <ellipse cx="12" cy="16.4" rx="1.9" ry="1.15" fill="#2D0A18" />
    </svg>
  );
}

/** 흰색 말풍선 + 내부에 브랜드 그린(#00C300)으로 ‘LINE’ 워드마크(단순화 패스) */
function IconLineBubble({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="currentColor"
        d="M12 4.2C7.7 4.2 4.3 7.15 4.3 10.9c0 2.75 2.2 5.05 5.2 5.65.32.06.6.28.72.58l.55 1.42c.18.46.72.62 1.1.32l1.95-1.58a.85.85 0 0 1 .52-.18c3.35-.45 5.95-2.95 5.95-6.2 0-3.75-3.4-6.7-7.7-6.7Z"
      />
      <path
        fill="#00C300"
        d="M8.85 9.15h1.25v3.55H8.85V9.15Zm2.4 0h1.1l1.45 2.55 1.45-2.55h1.1v3.55h-1.05v-2l-1.25 2.2h-.04l-1.25-2.2v2h-1.05V9.15Zm6.05 0h2.2c.5 0 .88.14 1.14.42.24.25.38.6.38 1 0 .48-.22.88-.6 1.1l.62 1.55h-1.18l-.52-1.28h-.8v1.28h-1.08V9.15Zm2.08 1.75c.22 0 .38-.14.38-.38 0-.22-.14-.36-.38-.36h-.9v.74h.9Z"
      />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path fill="currentColor" d="M13.5 3.5 7 13h4.5l-1 7.5 8-11h-4.5l.5-6Z" />
    </svg>
  );
}

function IconShopee({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="currentColor"
        d="M16.2 6.2h-2.2l-.35-1.2a1.2 1.2 0 0 0-1.15-.85h-3.2c-.55 0-1.05.35-1.2.9l-.35 1.15H5.75c-.45 0-.75.3-.75.75v1.5c0 .45.3.75.75.75h.25l1.1 8.55c.1.75.75 1.35 1.5 1.35h8.9c.75 0 1.4-.55 1.55-1.3l1.15-8.6h.3c.45 0 .75-.3.75-.75v-1.5c0-.45-.3-.75-.75-.75Zm-7.65-.85h3.15l.25.85H8.35l.2-.85Zm-.55 11.9c0 .35-.3.65-.65.65s-.65-.3-.65-.65V11.5c0-.35.3-.65.65-.65s.65.3.65.65v5.75Zm4.5 0c0 .35-.3.65-.65.65s-.65-.3-.65-.65V11.5c0-.35.3-.65.65-.65s.65.3.65.65v5.75Z"
      />
      <path
        fill="currentColor"
        fillOpacity="0.92"
        d="M13.2 8.5c.85.15 1.55.55 2 1.15.45-.25.95-.4 1.5-.4 1.45 0 2.65 1.2 2.65 2.65 0 1.5-1.2 2.7-2.65 2.7-.45 0-.9-.1-1.25-.3-.55.45-1.3.75-2.15.75-1.75 0-3.15-1.15-3.15-2.55 0-1.4 1.4-2.55 3.15-2.55h-.15Z"
      />
    </svg>
  );
}

function IconLazadaHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        fill="currentColor"
        d="M12 18.35 5.2 11.1c-1.65-1.7-1.6-4.45.1-6.1 1.7-1.65 4.4-1.6 6.05.05.05.05.35.4.65.75.3-.35.6-.7.65-.75 1.65-1.65 4.35-1.7 6.05-.05 1.7 1.65 1.75 4.4.1 6.1L12 18.35Z"
      />
    </svg>
  );
}

const QUICK_APPS: QuickAppDef[] = [
  {
    id: 'grab',
    href: 'https://www.grab.com/th/',
    labelKo: 'Grab',
    labelTh: 'Grab',
    tileClassName: 'bg-[#00B14F]',
    icon: <IconGrab className="h-[26px] w-[26px] text-white" />,
  },
  {
    id: 'foodpanda',
    href: 'https://www.foodpanda.co.th/',
    labelKo: 'foodpanda',
    labelTh: 'foodpanda',
    tileClassName: 'bg-[#D70F64]',
    icon: <IconFoodpanda className="h-[28px] w-[28px] text-white" />,
  },
  {
    id: 'line',
    href: 'https://line.me/th/',
    labelKo: 'LINE',
    labelTh: 'LINE',
    tileClassName: 'bg-[#00C300]',
    icon: <IconLineBubble className="h-[28px] w-[28px] text-white" />,
  },
  {
    id: 'bolt',
    href: 'https://bolt.eu/th-en/',
    labelKo: 'Bolt',
    labelTh: 'Bolt',
    tileClassName: 'bg-[#33D17A]',
    icon: <IconBolt className="h-[28px] w-[28px] text-white drop-shadow-sm" />,
  },
  {
    id: 'shopee',
    href: 'https://shopee.co.th/',
    labelKo: 'Shopee',
    labelTh: 'Shopee',
    tileClassName: 'bg-[#EE4D2D]',
    icon: <IconShopee className="h-[26px] w-[26px] text-white" />,
  },
  {
    id: 'lazada',
    href: 'https://www.lazada.co.th/',
    labelKo: 'Lazada',
    labelTh: 'Lazada',
    tileClassName: 'bg-gradient-to-r from-[#0F136D] to-[#F14B6A]',
    icon: <IconLazadaHeart className="h-[26px] w-[26px] text-white" />,
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
                        className={`group relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/10 shadow-lg outline-none ring-white/15 transition-all duration-200 ease-out hover:z-10 hover:scale-105 hover:shadow-xl hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-amber-300/75 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${app.tileClassName}`}
                      >
                        <span className="relative z-1 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out group-hover:scale-[1.04] motion-reduce:group-hover:scale-100">
                          {app.icon}
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
