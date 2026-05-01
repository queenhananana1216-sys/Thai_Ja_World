'use client';

import { useEffect } from 'react';

/**
 * 루트·하위 세그먼트 렌더링 중 throw 시 최후 방어.
 * (지시용 스니펫이 채팅에 미첨부되어 Next.js 표준 Error UI로 구성)
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error?.message, error?.digest);
  }, [error]);

  const message = error?.message != null ? String(error.message) : '알 수 없는 오류';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-[#0B0F19] px-6 py-16 text-slate-100">
      <div className="w-full max-w-lg rounded-xl border border-red-500/50 bg-black p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">렌더링 오류</p>
        <h1 className="mt-2 text-xl font-bold text-red-400">페이지를 표시하지 못했습니다</h1>
        <p className="mt-4 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-red-200/90">
          {message}
        </p>
        {error?.digest ? (
          <p className="mt-4 text-[11px] text-slate-500">digest: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
        >
          다시 시도
        </button>
      </div>
      <p className="max-w-md text-center text-[11px] text-slate-500">
        문제가 계속되면 시크릿 창으로 열거나 캐시를 비운 뒤 새로고침해 보세요.
      </p>
    </div>
  );
}
