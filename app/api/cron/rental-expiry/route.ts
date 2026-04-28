import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const pipelineId = 'cron/rental-expiry';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'rental_expiry', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc('minihome_expire_rentals_and_reset');
    if (error) throw new Error(error.message);
    await logCronEvent({ pipelineId, event: 'rental_expiry', status: 'success', meta: { expired: Number(data ?? 0) } });
    return NextResponse.json({ status: 'ok', expired: Number(data ?? 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/rental-expiry]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'rental_expiry',
      reason: message.toLowerCase().includes('timeout') ? 'rental_expiry_timeout' : 'rental_expiry_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
