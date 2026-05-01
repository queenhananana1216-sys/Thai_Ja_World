import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 브라우저 세션 쿠키 기준으로 마스터 관리자 여부 — GlobalNav SSR 불일치 보정용.
 * 캐시 금지 (로그인 상태별로 달라야 함).
 */
export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  return NextResponse.json(
    { masterAdmin: gate !== false },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
