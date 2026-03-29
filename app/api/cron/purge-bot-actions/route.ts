/**
 * GET /api/cron/purge-bot-actions — BOT_ACTIONS_RETENTION_DAYS(기본 7)보다 오래된 bot_actions 삭제
 */
import { type NextRequest, NextResponse } from 'next/server';
import { purgeStaleBotActions } from '@/bots/actions/purgeStaleBotActions';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const result = await purgeStaleBotActions();
  if (!result.ok) {
    return NextResponse.json(
      { status: 'error', error: result.error ?? 'purge failed' },
      { status: 500 },
    );
  }
  return NextResponse.json({ status: 'ok', deleted_approx: result.matched ?? null });
}
