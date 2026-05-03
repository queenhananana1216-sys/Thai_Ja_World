/**
 * POST /api/admin/force-news — 관리자 세션으로 뉴스 수집·요약 파이프라인 1회 즉시 실행
 * (Vercel Cron / CRON_SECRET 없이, `/api/cron/news` 와 동일한 `runNewsIngestPipeline` 경로)
 *
 * Body (선택): `{ "itemsPerFeed"?: number, "limit"?: number }` — 크론 쿼리와 동일 상한
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { parseAdminAllowedEmails } from '@/lib/admin/adminAllowedEmails';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_ITEMS = 50;
const MAX_LIMIT = 30;

function allowedActor(email: string | undefined): boolean {
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  const list = parseAdminAllowedEmails();
  if (list.length === 0) return true;
  return list.includes(e);
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabaseAuth = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!allowedActor(user?.email)) {
    return NextResponse.json(
      { status: 'error', error: '권한이 없습니다. 관리자 이메일로 로그인했는지 확인하세요.' },
      { status: 403 },
    );
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'MISSING_SERVICE_ROLE',
        hint: 'Vercel에 SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL을 설정하세요. 뉴스 파이프라인은 anon 키로 쓸 수 없습니다.',
      },
      { status: 503 },
    );
  }

  let body: { itemsPerFeed?: unknown; limit?: unknown } = {};
  try {
    const parsed = (await req.json()) as { itemsPerFeed?: unknown; limit?: unknown };
    if (parsed && typeof parsed === 'object') body = parsed;
  } catch {
    body = {};
  }

  const collectOpts: { itemsPerFeed?: number } = {};
  const processOpts: { limit?: number } = {};

  const ipf = body.itemsPerFeed;
  if (ipf !== undefined && ipf !== null) {
    const n = Math.floor(Number(ipf));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_ITEMS) collectOpts.itemsPerFeed = n;
  }

  const lim = body.limit;
  if (lim !== undefined && lim !== null) {
    const n = Math.floor(Number(lim));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_LIMIT) processOpts.limit = n;
  }

  const pipelineId = 'cron/news';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({
      pipelineId,
      event: 'news_fetch',
      status: 'fallback',
      meta: { mode: 'pause_skip', route: '/api/admin/force-news', triggeredBy: 'admin' },
    });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  try {
    const { collect: collectRun, process: summarizeRun } = await runNewsIngestPipeline({
      collect: collectOpts,
      process: processOpts,
    });
    await logCronEvent({
      pipelineId,
      event: 'news_fetch',
      status: 'success',
      meta: {
        route: '/api/admin/force-news',
        triggeredBy: 'admin',
        adminEmail: user?.email ?? null,
      },
    });
    revalidatePath('/');
    revalidatePath('/news');
    return NextResponse.json({
      status: 'ok',
      collect: collectRun,
      process: summarizeRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/admin/force-news]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'news_fetch',
      reason: message.toLowerCase().includes('timeout') ? 'news_api_timeout' : 'news_fetch_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
