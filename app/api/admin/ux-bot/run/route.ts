import { NextResponse } from 'next/server';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Body = {
  windowMinutes?: number;
};

export async function POST(req: Request): Promise<NextResponse> {
  const admin = await resolveAdminAccess();
  if (!admin) {
    return NextResponse.json(
      { status: 'error', error: '권한이 없습니다. 관리자 계정으로 로그인해 주세요.' },
      { status: 403 },
    );
  }

  let body: Body = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json({ status: 'error', error: '요청 본문 JSON 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const wmRaw = body.windowMinutes;
  const windowMinutes =
    typeof wmRaw === 'number' && Number.isFinite(wmRaw) ? Math.min(60, Math.max(5, Math.floor(wmRaw))) : 15;

  const result = await runUxOptimizationLoop(windowMinutes);
  if (!result.ok) {
    return NextResponse.json(
      { status: 'error', error: result.error ?? 'ux_loop_failed', run_id: result.run_id },
      { status: 500 },
    );
  }
  return NextResponse.json({
    status: 'ok',
    run_id: result.run_id,
    metrics: result.metrics ?? null,
    flags: result.flags ?? null,
    actor: admin.email,
  });
}

