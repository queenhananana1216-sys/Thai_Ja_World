/**
 * GET /api/news — 공개 뉴스 요약 목록 (캐시 비활성화)
 * 홈 SSR은 `fetchPortalHomeFeed` 경로를 쓰며, 이 라우트는 JSON 소비·헬스체크용이며
 * Vercel Data Cache에 오래된 목록이 붙지 않도록 dynamic + revalidate 0 을 고정한다.
 */
import { NextResponse } from 'next/server';
import { fetchHomeNewsDigest } from '../../_components/home/home-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const raw = url.searchParams.get('limit');
  const n = raw ? parseInt(raw, 10) : 20;
  const limit = Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 20;

  const { rows, error } = await fetchHomeNewsDigest(limit, { summaryLocale: 'ko' });

  if (error) {
    return NextResponse.json(
      { error },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
        },
      },
    );
  }

  return NextResponse.json(
    { items: rows },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    },
  );
}
