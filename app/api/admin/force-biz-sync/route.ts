import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runForceBizSyncSeed } from '@/lib/korean-biz/runBizRadarCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function authorize(req: Request): Promise<boolean> {
  if (await resolveAdminAccess()) return true;
  if (isCronAuthorized(req.headers.get('authorization'))) return true;
  return false;
}

async function handle(req: Request): Promise<NextResponse> {
  if (!(await authorize(req))) {
    return NextResponse.json(
      { ok: false, error: '관리자 로그인 또는 Authorization: Bearer CRON_SECRET 가 필요합니다.' },
      { status: 403 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRole) {
    return NextResponse.json(
      {
        ok: false,
        error:
          '서버 환경에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다. (로컬 .env.local)',
      },
      { status: 503 },
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 가 없습니다.' },
      { status: 503 },
    );
  }

  const result = await runForceBizSyncSeed();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request): Promise<NextResponse> {
  return handle(req);
}

export async function GET(req: Request): Promise<NextResponse> {
  return handle(req);
}
