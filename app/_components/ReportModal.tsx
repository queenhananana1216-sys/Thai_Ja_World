'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Locale } from '@/i18n/types';

const ReportModalDialog = dynamic(() => import('./ReportModalDialog'), {
  ssr: false,
  loading: () => null,
});

export function ReportQuickMenuTile({
  locale,
  iconClassName,
  label,
}: {
  locale: Locale;
  iconClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <li className="min-w-0">
        <button
          type="button"
          className="flex w-full touch-manipulation flex-col items-center gap-2 rounded-xl px-1 py-1 text-gray-100 active:opacity-90"
          onClick={() => setOpen(true)}
        >
          <span
            className={
              iconClassName ??
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-800/90 text-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            }
            aria-hidden
          >
            🚨
          </span>
          <span className="line-clamp-2 w-full text-center text-sm font-semibold leading-snug">{label}</span>
        </button>
      </li>
      {open ? <ReportModalDialog open={open} onClose={() => setOpen(false)} locale={locale} /> : null}
    </>
  );
}
