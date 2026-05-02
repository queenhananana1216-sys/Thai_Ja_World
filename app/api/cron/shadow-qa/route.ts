/**
 * Shadow QA — 통합 게시판(board_posts) 글쓰기·조회·삭제 E2E 프로브.
 *
 * 트리거: Vercel Cron 10분마다(vercel.json) + Authorization: Bearer CRON_SECRET
 * 필수 env: SHADOW_QA_BOT_USER_ID — Supabase Auth user UUID (QA 전용 계정)
 *
 * 동작: POST /api/boards 와 동일한 parseBoardPostBody 검증 후 RPC insert → SELECT 검증 → RPC delete.
 * 전체 3초 초과 또는 단계 오류 시 console.error 및 503(모니터링용).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { parseBoardPostBody } from '@app/api/boards/boardPayload';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';
import { isCronAuthorized } from '@/lib/cronAuth';
import { shouldMaskRawDbError } from '@/lib/db/dbErrorDefense';
import { notifyOwnerOmniCritical } from '@/lib/ops/ownerOmniHotline';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PIPELINE_ID = 'cron/shadow-qa';
const SLA_MS = 3000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function logShadowFailure(step: string, message: string, meta?: Record<string, unknown>): void {
  const infraHint = shouldMaskRawDbError(message)
    ? ' (possible schema cache / PostgREST sync — check Supabase logs)'
    : '';
  console.error(`[shadow-qa] FAIL step=${step}${infraHint}`, message, meta ?? {});
}

function parseBotUserId(): string | null {
  const raw = process.env.SHADOW_QA_BOT_USER_ID?.trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

async function hotlineShadowFailure(detail: string, fingerprint: string): Promise<void> {
  try {
    await notifyOwnerOmniCritical({ kind: 'shadow_qa', fingerprint, detail });
  } catch (e) {
    console.error('[shadow-qa] owner hotline failed', e);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const paused = await findActivePause(PIPELINE_ID);
  if (paused) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(PIPELINE_ID, paused.pausedUntil, paused.reason);
  }

  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const botUserId = parseBotUserId();
  if (!botUserId) {
    console.error(
      '[shadow-qa] FAIL step=config',
      'SHADOW_QA_BOT_USER_ID missing or not a valid UUID — set to QA Bot auth user id',
    );
    await hotlineShadowFailure(
      'SHADOW_QA_BOT_USER_ID 없음 또는 UUID 형식 아님',
      'shadow_qa:config_missing',
    );
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_or_invalid_SHADOW_QA_BOT_USER_ID',
      },
      { status: 503 },
    );
  }

  const ts = new Date().toISOString();
  const rawBody = {
    board_type: 'free',
    title: `[shadow-qa] ${ts}`,
    content: 'Automated board_posts shadow QA probe (deleted immediately).',
    image_urls: [] as string[],
    lat: null,
    lng: null,
    address: null,
  };

  const parsed = parseBoardPostBody(rawBody);
  if (!parsed.ok) {
    logShadowFailure('validate', parsed.error, { botUserId });
    await registerFailureAndSelfHeal({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      reason: 'shadow_qa_validate_failed',
      retryCount: 1,
    });
    await hotlineShadowFailure(`validate: ${parsed.error}`, 'shadow_qa:validate');
    return NextResponse.json({ ok: false, step: 'validate', error: parsed.error }, { status: 500 });
  }

  const { payload } = parsed;
  const admin = createServiceRoleClient();
  const t0 = performance.now();
  let insertMs = 0;
  let selectMs = 0;
  let deleteMs = 0;
  let postId: string | null = null;

  try {
    const tIns0 = performance.now();
    const { data: id, error: insErr } = await admin.rpc('board_posts_insert_for_service', {
      p_user_id: botUserId,
      p_board_type: payload.board_type,
      p_title: payload.title,
      p_content: payload.content,
      p_image_urls: payload.image_urls,
      p_lat: payload.lat,
      p_lng: payload.lng,
      p_address: payload.address,
    });
    insertMs = Math.round(performance.now() - tIns0);

    if (insErr) {
      logShadowFailure('insert', insErr.message, { insertMs, code: insErr.code });
      await registerFailureAndSelfHeal({
        pipelineId: PIPELINE_ID,
        event: 'shadow_qa_cycle',
        reason: insErr.message.toLowerCase().includes('timeout')
          ? 'shadow_qa_db_timeout'
          : 'shadow_qa_insert_failed',
        retryCount: 1,
      });
      const totalMs = Math.round(performance.now() - t0);
      if (totalMs >= SLA_MS) {
        console.error('[shadow-qa] SLA breach after insert failure', { totalMs, SLA_MS });
      }
      await hotlineShadowFailure(
        `insert RPC: ${insErr.message}`,
        'shadow_qa:insert_rpc',
      );
      return NextResponse.json(
        { ok: false, step: 'insert', error: insErr.message, ms: { insert: insertMs, total: totalMs } },
        { status: 503 },
      );
    }

    if (!id) {
      logShadowFailure('insert', 'insert_returned_null', { insertMs });
      await registerFailureAndSelfHeal({
        pipelineId: PIPELINE_ID,
        event: 'shadow_qa_cycle',
        reason: 'shadow_qa_insert_null',
        retryCount: 1,
      });
      await hotlineShadowFailure('insert returned null id', 'shadow_qa:insert_null');
      return NextResponse.json({ ok: false, step: 'insert', error: 'insert_failed' }, { status: 500 });
    }

    postId = String(id);

    const tSel0 = performance.now();
    const { data: row, error: selErr } = await admin
      .from('board_posts')
      .select('id,user_id,board_type,title')
      .eq('id', postId)
      .maybeSingle();
    selectMs = Math.round(performance.now() - tSel0);

    if (selErr) {
      logShadowFailure('select', selErr.message, { postId, selectMs, code: selErr.code });
    } else if (!row) {
      logShadowFailure('select', 'row_not_found_after_insert', { postId, selectMs });
    } else if (row.user_id !== botUserId || row.board_type !== payload.board_type || row.title !== payload.title) {
      logShadowFailure('select', 'row_mismatch', {
        postId,
        selectMs,
        expected: { user_id: botUserId, board_type: payload.board_type, title: payload.title },
        got: { user_id: row.user_id, board_type: row.board_type, title: row.title },
      });
    }

    const selectOk =
      !selErr &&
      !!row &&
      row.user_id === botUserId &&
      row.board_type === payload.board_type &&
      row.title === payload.title;

    const tDel0 = performance.now();
    const { data: deleted, error: delErr } = await admin.rpc('board_posts_delete_for_service', {
      p_post_id: postId,
      p_user_id: botUserId,
    });
    deleteMs = Math.round(performance.now() - tDel0);

    if (delErr) {
      logShadowFailure('delete', delErr.message, { postId, deleteMs, code: delErr.code });
    } else if (!deleted) {
      logShadowFailure('delete', 'delete_returned_false_orphan_risk', { postId, deleteMs });
    }

    const deleteOk = !delErr && deleted === true;

    const totalMs = Math.round(performance.now() - t0);
    const slaBreach = totalMs >= SLA_MS;
    if (slaBreach) {
      console.error('[shadow-qa] SLA breach (slow DB or schema lock suspected)', {
        totalMs,
        SLA_MS,
        insertMs,
        selectMs,
        deleteMs,
      });
    }

    const ok = selectOk && deleteOk && !slaBreach;

    if (!ok) {
      await registerFailureAndSelfHeal({
        pipelineId: PIPELINE_ID,
        event: 'shadow_qa_cycle',
        reason: slaBreach
          ? 'shadow_qa_sla_breach'
          : !selectOk
            ? 'shadow_qa_select_failed'
            : 'shadow_qa_delete_failed',
        retryCount: 1,
      });
      const detail = [
        `selectOk=${selectOk}`,
        `deleteOk=${deleteOk}`,
        `slaBreach=${slaBreach}`,
        `postId=${postId ?? '—'}`,
      ].join(' ');
      await hotlineShadowFailure(detail, 'shadow_qa:pipeline_step');
    } else {
      await logCronEvent({
        pipelineId: PIPELINE_ID,
        event: 'shadow_qa_cycle',
        status: 'success',
        meta: { ms: { insert: insertMs, select: selectMs, delete: deleteMs, total: totalMs } },
      });
    }

    return NextResponse.json(
      {
        ok,
        ms: { insert: insertMs, select: selectMs, delete: deleteMs, total: totalMs },
        slaMs: SLA_MS,
        slaBreach,
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logShadowFailure('unexpected', message, { postId });
    await registerFailureAndSelfHeal({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      reason: message.toLowerCase().includes('timeout') ? 'shadow_qa_db_timeout' : 'shadow_qa_exception',
      retryCount: 1,
    });

    if (postId) {
      try {
        await admin.rpc('board_posts_delete_for_service', {
          p_post_id: postId,
          p_user_id: botUserId,
        });
      } catch {
        console.error('[shadow-qa] cleanup delete after exception failed', { postId });
      }
    }

    const totalMs = Math.round(performance.now() - t0);
    if (totalMs >= SLA_MS) {
      console.error('[shadow-qa] SLA breach after exception', { totalMs, SLA_MS });
    }

    await hotlineShadowFailure(`exception: ${message}`, 'shadow_qa:exception');

    return NextResponse.json(
      { ok: false, step: 'exception', error: message, ms: { total: totalMs } },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
