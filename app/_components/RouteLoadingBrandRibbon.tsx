'use client';

import { TjBrandElephantMark } from '@/components/brand/TjBrandElephantMark';
import { cn } from '@/lib/utils';

/** 세그먼트 `loading.tsx`에서 스켈레톤 위에 브랜드 로딩을 붙일 때 사용 */
export function RouteLoadingBrandRibbon({ className }: { className?: string }) {
  return (
    <div className={cn('flex justify-center pb-4', className)} aria-hidden>
      <span className="inline-flex rounded-full p-1 ring-1 ring-cyan-400/25 bg-cyan-500/10">
        <TjBrandElephantMark size={40} animate="breathe" />
      </span>
    </div>
  );
}
