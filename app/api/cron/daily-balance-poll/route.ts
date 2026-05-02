/**
 * 매일 00:00 KST(UTC 15:00) — 당일 밸런스 게임 투표 1건 보장.
 * `vercel.json` → `/api/cron/daily-balance-poll`, Authorization: Bearer CRON_SECRET
 */
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isCronAuthorized } from '@/lib/cronAuth';
import { ensureDailyBalancePoll } from '@/lib/cron/ensureDailyBalancePoll';
import { GHOSTWRITER_SYSTEM_USER_ID } from '@/lib/cron/ghostwriterBot';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveActorUserId(): string {
  const a = process.env.AUTO_CONTENT_BOARD_USER_ID?.trim();
  if (a && UUID_RE.test(a)) return a;
  const b = process.env.SHADOW_QA_BOT_USER_ID?.trim();
  if (b && UUID_RE.test(b)) return b;
  return GHOSTWRITER_SYSTEM_USER_ID;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const actorId = resolveActorUserId();
  const res = await ensureDailyBalancePoll(admin, actorId);

  if (res.ok && 'id' in res && res.id) {
    revalidatePath('/');
  }

  return NextResponse.json(res);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
