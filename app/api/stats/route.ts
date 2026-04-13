import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
// 10분 캐시 — 매 요청마다 DB 쿼리하지 않도록
export const revalidate = 600;

export async function GET() {
  try {
    const admin = createServiceRoleClient();

    const [
      { count: memberCount },
      { count: postCount },
      { count: spotCount },
      { count: newsCount },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('posts').select('*', { count: 'exact', head: true }),
      admin.from('local_spots').select('*', { count: 'exact', head: true }).eq('is_published', true),
      admin.from('processed_news').select('*', { count: 'exact', head: true }).eq('published', true),
    ]);

    return NextResponse.json(
      {
        memberCount: memberCount ?? 0,
        postCount: postCount ?? 0,
        spotCount: spotCount ?? 0,
        newsCount: newsCount ?? 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[/api/stats] 집계 오류:', error);
    return NextResponse.json(
      { memberCount: 0, postCount: 0, spotCount: 0, newsCount: 0 },
      { status: 500 }
    );
  }
}
