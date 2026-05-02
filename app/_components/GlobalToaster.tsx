'use client';

import { Toaster } from 'sonner';

/** 홈·포털 등 `/boards` 바깥에서도 동일 토스트 UX */
export default function GlobalToaster() {
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
