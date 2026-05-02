/**
 * 고스트라이터 — 태국 생활·여행 템플릿을 주기적으로 board_posts(tips|reports)에 자동 게시.
 * Vercel Cron: Authorization: Bearer CRON_SECRET
 *
 * 필수 env (또는 SHADOW_QA_BOT_USER_ID 폴백): 유효한 profiles.id / Auth user UUID
 *   AUTO_CONTENT_BOARD_USER_ID
 */
import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  AUTO_CONTENT_GHOSTWRITER_TEMPLATES,
  buildAutoContentBody,
} from '@/lib/cron/autoContentGhostwriter';
import { isCronAuthorized } from '@/lib/cronAuth';
import { findActivePause, logCronEvent, pausedResponse } from '@/lib/cron/omniLogger';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PIPELINE_ID = 'cron/auto-content';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveActorUserId(): string | null {
  const a = process.env.AUTO_CONTENT_BOARD_USER_ID?.trim();
  if (a && UUID_RE.test(a)) return a;
  const b = process.env.SHADOW_QA_BOT_USER_ID?.trim();
  if (b && UUID_RE.test(b)) return b;
  return null;
}

function pickTemplate() {
  const list = AUTO_CONTENT_GHOSTWRITER_TEMPLATES;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
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
  if (!actorId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_actor',
        hint: 'Set AUTO_CONTENT_BOARD_USER_ID (or SHADOW_QA_BOT_USER_ID) to a valid Supabase user UUID.',
      },
      { status: 503 },
    );
  }

  const picked = pickTemplate();
  const content = buildAutoContentBody({ boardType: picked.boardType, title: picked.title });

  const admin = createServiceRoleClient();
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
      lat: null,
      lng: null,
      address: null,
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
