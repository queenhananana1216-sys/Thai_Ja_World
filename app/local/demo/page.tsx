import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Local demo',
  robots: { index: false, follow: false },
};

/** Shadow QA 순찰용 고정 라우트 — 다크 톤 유지(bg-white 금지 정책과 충돌하지 않게) */
export default function LocalDemoPatrolPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-slate-200">
      <h1 className="text-xl font-bold text-white">Local demo</h1>
      <p className="mt-2 text-sm text-slate-400">
        QA 크론이 이 경로 존재·렌더를 검증합니다. 로컬 허브는{' '}
        <Link href="/local" className="font-semibold text-amber-200 underline-offset-2 hover:underline">
          /local
        </Link>
        을 이용하세요.
      </p>
    </main>
  );
}
