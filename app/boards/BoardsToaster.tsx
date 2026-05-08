'use client';

import { Toaster } from '@/components/ui/sonner';

/** `/boards` 레이아웃 전용 — 중앙 토스트 */
export function BoardsToaster() {
  return (
    <Toaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'backdrop-blur-xl border border-white/20 bg-slate-900/90 text-slate-100 shadow-2xl',
        },
      }}
    />
  );
}
