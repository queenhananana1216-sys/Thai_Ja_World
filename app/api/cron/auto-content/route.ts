/**
 * 고스트라이터 — 태국 생활·여행 템플릿을 주기적으로 board_posts(tips|reports)에 자동 게시.
 * 주제 배열·킬러 피드 제목: `src/lib/cron/autoContentGhostwriter.ts` 의 `AUTO_CONTENT_GHOSTWRITER_TEMPLATES`.
 * Vercel Cron: `vercel.json` → `/api/cron/auto-content` (4시간마다), Authorization: Bearer CRON_SECRET
 *
 * 작성자: `GHOSTWRITER_SYSTEM_USER_ID` (마이그레이션 138 — 시스템 봇 프로필 / profiles 동기화)
 * 선택 env로 다른 UUID 덮어쓰기: AUTO_CONTENT_BOARD_USER_ID, SHADOW_QA_BOT_USER_ID
 */
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { buildAutoContentBody, pickRandomAutoContentTemplate } from '@/lib/cron/autoContentGhostwriter';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse } from '@/lib/cron/omniLogger';
import { ensureDailyBalancePoll } from '@/lib/cron/ensureDailyBalancePoll';
import { GHOSTWRITER_SYSTEM_USER_ID } from '@/lib/cron/ghostwriterBot';
import { seedGhostBoardPostVitality } from '@/lib/cron/seedGhostBoardPostVitality';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PIPELINE_ID = 'cron/auto-content';

/** RFC UUID + 레거시 시스템 봇 ID(버전 니블 0) 허용 */
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
  const paused = await findActivePause(PIPELINE_ID);
  if (paused) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'ghostwriter',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(PIPELINE_ID, paused.pausedUntil, paused.reason);
  }

  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const dryRun = req.nextUrl.searchParams.get('dry_run') === '1';

  const actorId = resolveActorUserId();

  const picked = pickRandomAutoContentTemplate();
  const content = buildAutoContentBody({ boardType: picked.boardType, title: picked.title });

  const admin = createServiceRoleClient();

  try {
    const pollR = await ensureDailyBalancePoll(admin, actorId);
    if (pollR.ok && 'id' in pollR && pollR.id) {
      revalidatePath('/');
    }
  } catch (e) {
    console.warn('[cron/auto-content] ensureDailyBalancePoll', e);
  }

  const since = new Date(Date.now() - 14 * 86400_000).toISOString();
  const { data: dupRows } = await admin
    .from('board_posts')
    .select('id')
    .eq('title', picked.title)
    .gte('created_at', since)
    .limit(1);

  if (dupRows?.length) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'ghostwriter',
      status: 'success',
      meta: { skipped: 'duplicate_title', title: picked.title },
    });
    return NextResponse.json({
      ok: true,
      skipped: 'duplicate_title',
      title: picked.title,
      board_type: picked.boardType,
    });
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      would_insert: {
        title: picked.title,
        board_type: picked.boardType,
        display_author_label: picked.authorLabel,
        user_id: actorId,
      },
    });
  }

  const { data: insertedRows, error } = await admin
    .from('board_posts')
    .insert({
      user_id: actorId,
      board_type: picked.boardType,
      title: picked.title,
      content,
      image_urls: [],
      home_highlight: true,
      auto_curated: true,
      display_author_label: picked.authorLabel,
    })
    .select('id');

  if (error) {
    console.error('[cron/auto-content] insert failed', error.message);
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'ghostwriter',
      status: 'failed',
      meta: { message: error.message, code: error.code ?? null },
    });
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
  }

  const id = insertedRows?.[0]?.id as string | undefined;
  if (!id) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'ghostwriter',
      status: 'failed',
      meta: { message: 'insert_returned_no_rows' },
    });
    return NextResponse.json({ ok: false, error: 'insert_returned_no_rows' }, { status: 500 });
  }

  revalidatePath('/');
  revalidatePath('/boards');

  try {
    await seedGhostBoardPostVitality(admin, id);
  } catch (e) {
    console.warn('[cron/auto-content] seedGhostBoardPostVitality', e);
  }

  await logCronEvent({
    pipelineId: PIPELINE_ID,
    event: 'ghostwriter',
    status: 'success',
    meta: { id, board_type: picked.boardType, title: picked.title },
  });

  return NextResponse.json({
    ok: true,
    id,
    board_type: picked.boardType,
    title: picked.title,
    display_author_label: picked.authorLabel,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
