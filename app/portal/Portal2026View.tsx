import Link from 'next/link';

/**
 * 과거 필고형 목업(FALLBACK_BOARDS 등)은 제거됨.
 * 실제 홈 3열은 `app/page.tsx` + `fetchPortalHomeFeed`만 사용.
 */
export default function Portal2026View() {
  return (
    <main className="min-h-screen bg-[#0B0F19] px-4 py-6 text-slate-300">
      <p className="text-sm leading-relaxed">
        이 뷰는 더 이상 샘플 데이터를 표시하지 않습니다. 포털 홈은{' '}
        <Link href="/" className="font-semibold text-amber-300 underline">
          루트 경로
        </Link>
        에서 SSR로 로드됩니다.
      </p>
    </main>
  );
}
