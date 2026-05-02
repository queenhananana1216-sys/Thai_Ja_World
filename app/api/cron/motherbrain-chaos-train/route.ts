/**
 * Motherbrain Chaos Train — 샌드박스(메모리)에서 금지 패턴 검출기 회귀 검증 후 ISR 무효화·로그.
 * 트리거: Vercel Cron — Authorization: Bearer CRON_SECRET
 *
 * MOTHERBRAIN_TRAIN_NOTIFY_PGRST=1 이면 검증 성공 후 chaos_monkey_notify_pgrst_reload_schema 호출(운영 부하 주의).
 */
import { type NextRequest, NextResponse } from 'next/server';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { detectForbiddenBgWhite } from '@/lib/cron/shadowQaUiPatrol';
import { isCronAuthorized } from '@/lib/cronAuth';
import { revalidateMotherbrainPaths } from '@/lib/server/motherbrainRevalidate';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PIPELINE_ID = 'cron/motherbrain-chaos-train';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const paused = await findActivePause(PIPELINE_ID);
  if (paused) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'motherbrain_chaos_train',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(PIPELINE_ID, paused.pausedUntil, paused.reason);
  }

  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const badWhite = '<main class="card bg-white text-black"><p>x</p></main>';
  const goodDark = '<main class="bg-slate-900 text-slate-100"><p>x</p></main>';
  const goodOpacity = '<div class="bg-white/10 rounded-xl"></div>';

  const detectorOk =
    detectForbiddenBgWhite(badWhite) === true &&
    detectForbiddenBgWhite(goodDark) === false &&
    detectForbiddenBgWhite(goodOpacity) === false;

  if (!detectorOk) {
    console.error('[motherbrain-chaos-train] detector regression — heal pipeline aborted');
    await registerFailureAndSelfHeal({
      pipelineId: PIPELINE_ID,
      event: 'motherbrain_chaos_train',
      reason: 'motherbrain_detector_regression',
      retryCount: 1,
    });
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'motherbrain_chaos_train',
      status: 'failed',
      meta: { reason: 'detector_regression' },
    });
    return NextResponse.json({ ok: false, error: 'detector_regression' }, { status: 503 });
  }

  const n = revalidateMotherbrainPaths('/local/demo');

  let pgrst_ok: boolean | null = null;
  if (process.env.MOTHERBRAIN_TRAIN_NOTIFY_PGRST === '1') {
    const admin = createServiceRoleClient();
    const { error } = await admin.rpc('chaos_monkey_notify_pgrst_reload_schema');
    pgrst_ok = !error;
    if (error) {
      console.error('[motherbrain-chaos-train] notify pgrst failed', error.message);
    }
  }

  await logCronEvent({
    pipelineId: PIPELINE_ID,
    event: 'motherbrain_chaos_train',
    status: 'success',
    meta: {
      revalidated_paths: n,
      synthetic_white_detected: true,
      dark_pass: true,
      opacity_variant_pass: true,
      pgrst_notify: pgrst_ok,
    },
  });

  return NextResponse.json({
    ok: true,
    revalidated_paths: n,
    pgrst_notify: pgrst_ok,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
