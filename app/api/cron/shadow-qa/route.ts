/**
 * Shadow QA — (1) 주요 공개 라우트 HTML 순찰·시각 톤·죽은 페이지 (2) board_posts DB E2E 프로브.
 *
 * 트리거: Vercel Cron 10분마다(vercel.json) + Authorization: Bearer CRON_SECRET
 * 필수 env: SHADOW_QA_BOT_USER_ID — Supabase Auth user UUID (QA 전용 계정)
 * 선택 env: SHADOW_QA_FETCH_ORIGIN — 순찰 대상 오리진(미설정 시 getSiteBaseUrl)
 *
 * UI 방어: HTML 내 금지 패턴 `bg-white`(opacity·접두 변형 제외), HTTP 404/500 → Critical UI Bug → 핫라인.
 */
import { type NextRequest, NextResponse } from 'next/server';
import { type BoardPostPayload, parseBoardPostBody } from '@app/api/boards/boardPayload';
import { findActivePause, logCronEvent, pausedResponse, registerFailureAndSelfHeal } from '@/lib/cron/omniLogger';
import {
  getShadowQaPatrolOrigin,
  runShadowQaUiPatrol,
  type UiPatrolRouteResult,
} from '@/lib/cron/shadowQaUiPatrol';
import { isCronAuthorized } from '@/lib/cronAuth';
import { shouldMaskRawDbError } from '@/lib/db/dbErrorDefense';
import { notifyOwnerOmniCritical } from '@/lib/ops/ownerOmniHotline';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

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

type BoardShadowQaOk = {
  ok: true;
  ms: { insert: number; select: number; delete: number; total: number };
  slaMs: number;
  slaBreach: boolean;
};

type BoardShadowQaErr = {
  ok: false;
  step: string;
  error?: string;
  httpStatus: number;
  ms?: Record<string, number>;
};

type BoardShadowQaResult = BoardShadowQaOk | BoardShadowQaErr;

function formatUiPatrolHotline(failed: UiPatrolRouteResult[], origin: string): string {
  return (
    `UI 순찰 실패 origin=${origin} ` +
    failed.map((r) => `${r.path} status=${r.status ?? '—'} [${r.issues.join('; ')}]`).join(' | ')
  );
}

function resolveBoardFailureReason(board: BoardShadowQaErr): string {
  switch (board.step) {
    case 'insert':
      if (board.error === 'insert_failed') return 'shadow_qa_insert_null';
      if (board.error?.toLowerCase().includes('timeout')) return 'shadow_qa_db_timeout';
      return 'shadow_qa_insert_failed';
    case 'select':
      return 'shadow_qa_select_failed';
    case 'delete':
      return 'shadow_qa_delete_failed';
    case 'sla':
      return 'shadow_qa_sla_breach';
    case 'exception':
      return board.error?.toLowerCase().includes('timeout') ? 'shadow_qa_db_timeout' : 'shadow_qa_exception';
    default:
      return 'shadow_qa_unknown';
  }
}

function combinedFailureFingerprint(failReason: string, uiPatrol: { ok: boolean; routes: UiPatrolRouteResult[] }, board: BoardShadowQaResult): string {
  const failedRoutes = uiPatrol.routes.filter((r) => !r.ok).map((r) => r.path);
  const u = failedRoutes.sort().join(',') || '—';
  const b = board.ok ? '—' : board.step;
  return `shadow_qa:cycle:${failReason}:${u}:${b}`.slice(0, 220);
}

async function runBoardPostsShadowQa(
  admin: ReturnType<typeof createServiceRoleClient>,
  botUserId: string,
  payload: BoardPostPayload,
): Promise<BoardShadowQaResult> {
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
      const totalMs = Math.round(performance.now() - t0);
      if (totalMs >= SLA_MS) {
        console.error('[shadow-qa] SLA breach after insert failure', { totalMs, SLA_MS });
      }
      return {
        ok: false,
        step: 'insert',
        error: insErr.message,
        httpStatus: 503,
        ms: { insert: insertMs, total: totalMs },
      };
    }

    if (!id) {
      logShadowFailure('insert', 'insert_returned_null', { insertMs });
      return { ok: false, step: 'insert', error: 'insert_failed', httpStatus: 500, ms: { insert: insertMs } };
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
      return {
        ok: false,
        step: slaBreach ? 'sla' : !selectOk ? 'select' : 'delete',
        error: slaBreach ? 'sla_breach' : !selectOk ? 'select_failed' : 'delete_failed',
        httpStatus: 503,
        ms: { insert: insertMs, select: selectMs, delete: deleteMs, total: totalMs },
      };
    }

    return {
      ok: true,
      ms: { insert: insertMs, select: selectMs, delete: deleteMs, total: totalMs },
      slaMs: SLA_MS,
      slaBreach: false,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    logShadowFailure('unexpected', message, { postId });

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

    return {
      ok: false,
      step: 'exception',
      error: message,
      httpStatus: 503,
      ms: { total: totalMs },
    };
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

  const patrolOrigin = getShadowQaPatrolOrigin();
  const uiPatrol = await runShadowQaUiPatrol(patrolOrigin);
  if (!uiPatrol.ok) {
    console.error('[shadow-qa] FAIL step=ui_patrol', {
      origin: patrolOrigin,
      failed: uiPatrol.routes.filter((r) => !r.ok),
    });
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
    const failedUi = uiPatrol.routes.filter((r) => !r.ok);
    const hotlineDetail = [
      `validate: ${parsed.error}`,
      failedUi.length ? formatUiPatrolHotline(failedUi, patrolOrigin) : null,
    ]
      .filter(Boolean)
      .join('\n');
    await hotlineShadowFailure(hotlineDetail, 'shadow_qa:validate');
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      status: 'failed',
      meta: { reason: 'validate_failed', ui_patrol: uiPatrol.routes, patrol_origin: patrolOrigin },
    });
    return NextResponse.json(
      { ok: false, step: 'validate', error: parsed.error, ui_patrol: uiPatrol },
      { status: 500 },
    );
  }

  const { payload } = parsed;
  const admin = createServiceRoleClient();
  const board = await runBoardPostsShadowQa(admin, botUserId, payload);

  const overallOk = uiPatrol.ok && board.ok;

  if (overallOk) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      status: 'success',
      meta: {
        ms: board.ms,
        ui_patrol: uiPatrol.routes,
        patrol_origin: patrolOrigin,
      },
    });
  } else {
    const failReason = !uiPatrol.ok
      ? 'shadow_qa_ui_patrol_failed'
      : !board.ok
        ? resolveBoardFailureReason(board)
        : 'shadow_qa_unknown';

    await registerFailureAndSelfHeal({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      reason: failReason,
      retryCount: 1,
    });

    const failedUi = uiPatrol.routes.filter((r) => !r.ok);
    const hotlineParts: string[] = [];
    if (failedUi.length) {
      hotlineParts.push(formatUiPatrolHotline(failedUi, patrolOrigin));
    }
    if (!board.ok) {
      hotlineParts.push(
        [
          `board step=${board.step}`,
          board.error ? `err=${board.error}` : null,
          board.ms ? `ms=${JSON.stringify(board.ms)}` : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
    }
    await hotlineShadowFailure(
      hotlineParts.join('\n'),
      combinedFailureFingerprint(failReason, uiPatrol, board),
    );

    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'shadow_qa_cycle',
      status: 'failed',
      meta: {
        reason: failReason,
        ui_patrol: uiPatrol.routes,
        board: board.ok ? { ms: board.ms } : { step: board.step, error: board.error },
        patrol_origin: patrolOrigin,
      },
    });
  }

  const status = overallOk ? 200 : 503;
  if (board.ok) {
    return NextResponse.json(
      {
        ok: overallOk,
        ui_patrol: uiPatrol,
        ms: board.ms,
        slaMs: board.slaMs,
        slaBreach: board.slaBreach,
        patrol_origin: patrolOrigin,
      },
      { status },
    );
  }

  return NextResponse.json(
    {
      ok: overallOk,
      ui_patrol: uiPatrol,
      step: board.step,
      error: board.error,
      ms: board.ms,
      patrol_origin: patrolOrigin,
    },
    { status },
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
