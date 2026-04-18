import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runQuestCronCycle } from '@/lib/quests/runQuestCronCycle';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const targetDate = req.nextUrl.searchParams.get('date') ?? undefined;
  const includeWeatherEvent = req.nextUrl.searchParams.get('weather') !== '0';
  const includeNewsEvent = req.nextUrl.searchParams.get('news') !== '0';
  const settleLimitRaw = Number(req.nextUrl.searchParams.get('settleLimit') ?? '200');
  const settleLimit = Number.isFinite(settleLimitRaw) ? settleLimitRaw : 200;

  try {
    const result = await runQuestCronCycle({
      targetDate,
      includeWeatherEvent,
      includeNewsEvent,
      settleLimit,
    });
    return NextResponse.json({ status: 'ok', ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/quests]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
