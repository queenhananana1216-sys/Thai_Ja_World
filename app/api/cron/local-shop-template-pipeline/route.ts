import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runLocalShopTemplatePipeline } from '@/lib/localShopTemplates/pipeline';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseLimit(v: string | null): number {
  const n = Number(v ?? '');
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

async function execute(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }
  const pipelineId = 'cron/local-shop-template-pipeline';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({
      pipelineId,
      event: 'local_template_pipeline',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const limit = parseLimit(req.nextUrl.searchParams.get('limit'));
    const result = await runLocalShopTemplatePipeline(limit);
    await logCronEvent({
      pipelineId,
      event: 'local_template_pipeline',
      status: result.failed > 0 ? 'delayed' : 'success',
      meta: result,
    });
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/local-shop-template-pipeline]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'local_template_pipeline',
      reason: message.toLowerCase().includes('timeout') ? 'local_template_timeout' : 'local_template_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return execute(req);
}

export async function POST(req: NextRequest) {
  return execute(req);
}
