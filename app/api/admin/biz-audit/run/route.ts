import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runBizRadarAuditCron } from '@/lib/korean-biz/runBizRadarAuditCron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

async function authorize(req: Request): Promise<boolean> {
  if (await resolveAdminAccess()) return true;
  return isCronAuthorized(req.headers.get('authorization'));
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const result = await runBizRadarAuditCron();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
