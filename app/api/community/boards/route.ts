/**
 * POST /api/community/boards — `/api/community/posts` 와 동일 핸들러
 * 게시글 INSERT 는 `SUPABASE_SERVICE_ROLE_KEY` 만 사용 (anon 금지); 검증은 `posts/route.ts` POST 시작 시 수행.
 */
import { NextResponse } from 'next/server';
import { POST as communityPostsPost } from '../posts/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          'Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY가 등록되지 않았습니다! Vercel 대시보드에서 추가해주세요.',
      },
      { status: 500 },
    );
  }
  return communityPostsPost(req);
}
