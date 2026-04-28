/**
 * GET /api/cron/push-daily-digest — 구독자에게 최신 1건 기준 일일 웹 푸시
 */
import { type NextRequest, NextResponse } from 'next/server';
import { sendDailyWebPushDigest } from '@/lib/push/sendDailyWebPush';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function siteOrigin(req: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/push-daily-digest';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'push_daily_digest', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const result = await sendDailyWebPushDigest(siteOrigin(req));
    await logCronEvent({ pipelineId, event: 'push_daily_digest', status: 'success', meta: { sent: result.sent ?? null } });
    return NextResponse.json({ status: 'ok', ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'push_daily_digest',
      reason: msg.toLowerCase().includes('timeout') ? 'push_timeout' : 'push_digest_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 });
  }
}
