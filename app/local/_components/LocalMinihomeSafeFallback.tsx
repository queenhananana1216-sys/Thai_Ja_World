'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { requestMotherbrainHeal } from '@/lib/client/motherbrainHeal';

/**
 * SSR 단계 예외 시에도 500 대신 표시 — motherbrain 캐시 무효화 + 짧은 간격으로 soft refresh.
 */
export default function LocalMinihomeSafeFallback({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const path = `/local/${encodeURIComponent(slug)}/minihome`;
    void requestMotherbrainHeal(path);
    const t = window.setTimeout(() => router.refresh(), 500);
    return () => clearTimeout(t);
  }, [router, slug]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      <p className="text-center text-sm font-medium text-slate-200">매장 메뉴판을 불러오는 중입니다.</p>
      <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-slate-500">
        네트워크나 잠깐의 지연이 있어도 이 페이지는 유지됩니다. 곧 자동으로 다시 시도합니다.
      </p>
    </main>
  );
}
