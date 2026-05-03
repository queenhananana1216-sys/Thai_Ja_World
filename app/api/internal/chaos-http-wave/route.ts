/**
 * POST /api/internal/chaos-http-wave
 * 도커 Chaos Monkey 스크립트가 HTTP 공격 웨이브 시작/종료를 기록 — 레이더 주황불(면역 훈련).
 *
 * Authorization: Bearer CHAOS_HTTP_WAVE_SECRET (또는 SANDBOX 시크릿과 동일 값 사용 가능)
 */
import { NextResponse } from 'next/server';
import { logCronEvent } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PIPELINE_ID = 'cron/chaos-http-wave';

function waveSecret(): string | null {
  return (
    process.env.CHAOS_HTTP_WAVE_SECRET?.trim() ||
    process.env.SANDBOX_PROPOSAL_INGEST_SECRET?.trim() ||
    process.env.WATCHDOG_SANDBOX_INGEST_SECRET?.trim() ||
    null
  );
}

type Body = { phase?: string; wave_id?: string; probes_ok?: number; probes_fail?: number };

export async function POST(request: Request): Promise<NextResponse> {
  const secret = waveSecret();
  if (!secret) {
    return NextResponse.json({ error: 'chaos_wave_secret_not_configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const phase = body.phase === 'completed' ? 'completed' : body.phase === 'started' ? 'started' : null;
  if (!phase) {
    return NextResponse.json({ error: 'phase_must_be_started_or_completed' }, { status: 400 });
  }

  const waveId =
    typeof body.wave_id === 'string' && body.wave_id.trim() ? body.wave_id.trim().slice(0, 80) : `wave-${Date.now()}`;

  await logCronEvent({
    pipelineId: PIPELINE_ID,
    event: 'chaos_http_wave',
    status: phase === 'started' ? 'delayed' : 'success',
    meta: {
      training_phase: phase,
      wave_id: waveId,
      probes_ok: typeof body.probes_ok === 'number' ? body.probes_ok : undefined,
      probes_fail: typeof body.probes_fail === 'number' ? body.probes_fail : undefined,
      note:
        phase === 'started'
          ? 'HTTP 카오스 웨이브 시작 — 레이더 주황(자가 면역 훈련)'
          : 'HTTP 카오스 웨이브 종료',
    },
  });

  return NextResponse.json({ ok: true, phase, wave_id: waveId });
}
