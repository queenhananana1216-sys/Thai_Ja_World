/**
 * Chaos Monkey — 격리 스키마 `local_orders_test` 전용 부하·타임아웃 훈련.
 *
 * 트리거: Vercel Cron(저트래픽 UTC 새벽) + Authorization: Bearer CRON_SECRET
 * 대상: public.local_orders 미사용. RPC만으로 local_orders_test 스키마 접근.
 *
 * CHAOS_MONKEY_DISABLED=1 이면 즉시 스킵(배포 직후 마이그레이션 전 안전장치).
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const PIPELINE_ID = 'cron/chaos-monkey';

/** 50 × 20 = 1000 rows, 다연결 경합으로 병목·데드락 가능성 증대 */
const SURGE_CHUNKS = 50;
const SURGE_CHUNK_SIZE = 20;

const FETCH_TIMEOUT_MS = 120;

function createShortTimeoutServiceClient(timeoutMs: number): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return createServiceRoleClient();
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (fetchUrl, init = {}) => {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), timeoutMs);
        return fetch(fetchUrl, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
      },
    },
  });
}

async function chaosSelfHeal(reason: string): Promise<void> {
  const admin = createServiceRoleClient();

  const reload = await admin.rpc('chaos_monkey_notify_pgrst_reload_schema');
  if (reload.error) {
    console.error('[chaos-monkey] self-heal notify pgrst failed', reload.error.message);
  }

  const queue = await admin.rpc('chaos_monkey_renormalize_queue');
  if (queue.error) {
    console.error('[chaos-monkey] self-heal queue renormalize failed', queue.error.message);
  }

  await registerFailureAndSelfHeal({
    pipelineId: PIPELINE_ID,
    event: 'chaos_monkey_cycle',
    reason,
    retryCount: 1,
  });

  await logCronEvent({
    pipelineId: PIPELINE_ID,
    event: 'chaos_monkey_self_heal',
    status: 'success',
    meta: { reason: reason.slice(0, 240) },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.CHAOS_MONKEY_DISABLED === '1') {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'chaos_monkey_cycle',
      status: 'fallback',
      meta: { mode: 'disabled_env' },
    });
    return NextResponse.json({ ok: true, skipped: true, reason: 'CHAOS_MONKEY_DISABLED' });
  }

  const paused = await findActivePause(PIPELINE_ID);
  if (paused) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'chaos_monkey_cycle',
      status: 'fallback',
      meta: { mode: 'pause_skip' },
    });
    return pausedResponse(PIPELINE_ID, paused.pausedUntil, paused.reason);
  }

  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const batchId = `chaos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  let surgeMs = 0;
  let surgeErrors = 0;
  let timeoutProbeAbort = false;
  let timeoutProbeErrorMessage: string | null = null;
  let seeded = 0;
  let pruned = 0;
  let renormalized = 0;

  try {
    const seedRes = await admin.rpc('chaos_monkey_seed_queue_jobs', { p_count: 8 });
    if (seedRes.error) {
      await chaosSelfHeal(`seed_failed:${seedRes.error.message}`);
      return NextResponse.json(
        { ok: false, step: 'seed', error: seedRes.error.message },
        { status: 503 },
      );
    }
    seeded = seedRes.data ?? 0;

    const tSurge0 = performance.now();
    const surgeResults = await Promise.all(
      Array.from({ length: SURGE_CHUNKS }, (_, i) =>
        admin.rpc('chaos_monkey_insert_qr_chunk', {
          p_batch_id: batchId,
          p_seq_from: i * SURGE_CHUNK_SIZE + 1,
          p_chunk_size: SURGE_CHUNK_SIZE,
        }),
      ),
    );
    surgeMs = Math.round(performance.now() - tSurge0);

    for (const r of surgeResults) {
      if (r.error) {
        surgeErrors += 1;
        console.error('[chaos-monkey] surge chunk failed', r.error.message, r.error.code);
      }
    }

    if (surgeErrors > 0) {
      await chaosSelfHeal(`surge_partial_failure:${surgeErrors}_chunks`);
    }

    const shortClient = createShortTimeoutServiceClient(FETCH_TIMEOUT_MS);
    const slow = await shortClient.rpc('chaos_monkey_pg_sleep_half_second');
    const msg = slow.error?.message ?? '';
    const aborted =
      msg.includes('abort') ||
      msg.includes('AbortError') ||
      msg.includes('The user aborted a request') ||
      msg.includes('terminated');

    const timeoutProbeUnexpected = Boolean(slow.error) && !aborted;
    timeoutProbeAbort = aborted || Boolean(slow.error);
    timeoutProbeErrorMessage = slow.error ? msg : null;

    if (!slow.error) {
      console.warn(
        '[chaos-monkey] timeout probe unexpectedly succeeded — increase sleep or lower FETCH_TIMEOUT_MS',
      );
    } else if (timeoutProbeUnexpected) {
      await chaosSelfHeal(`timeout_probe_unexpected_error:${msg}`);
    }

    const pruneRes = await admin.rpc('chaos_monkey_prune_batch', { p_batch_id: batchId });
    if (pruneRes.error) {
      await chaosSelfHeal(`prune_failed:${pruneRes.error.message}`);
      return NextResponse.json(
        {
          ok: false,
          step: 'prune',
          error: pruneRes.error.message,
          surge: { ms: surgeMs, chunk_errors: surgeErrors },
        },
        { status: 503 },
      );
    }
    pruned = pruneRes.data ?? 0;

    const ren = await admin.rpc('chaos_monkey_renormalize_queue');
    if (ren.error) {
      await chaosSelfHeal(`renormalize_failed:${ren.error.message}`);
      return NextResponse.json(
        {
          ok: false,
          step: 'renormalize',
          error: ren.error.message,
          surge: { ms: surgeMs, chunk_errors: surgeErrors },
        },
        { status: 503 },
      );
    }
    renormalized = ren.data ?? 0;

    const surgeOk = surgeErrors === 0;
    const ok = surgeOk && !timeoutProbeUnexpected && !pruneRes.error && !ren.error;

    if (ok) {
      await logCronEvent({
        pipelineId: PIPELINE_ID,
        event: 'chaos_monkey_cycle',
        status: 'success',
        meta: {
          batch_id: batchId,
          surge_ms: surgeMs,
          seeded,
          pruned,
          renormalized,
          timeout_probe: {
            client_timeout_ms: FETCH_TIMEOUT_MS,
            expected_abort: true,
            got_error: Boolean(slow.error),
            abort_signal: timeoutProbeAbort,
          },
        },
      });
    }

    return NextResponse.json(
      {
        ok,
        batch_id: batchId,
        surge: { ms: surgeMs, chunks: SURGE_CHUNKS, chunk_size: SURGE_CHUNK_SIZE, chunk_errors: surgeErrors },
        timeout_probe: {
          client_timeout_ms: FETCH_TIMEOUT_MS,
          sleep_rpc_sec: 0.5,
          aborted_or_client_error: timeoutProbeAbort,
          message: timeoutProbeErrorMessage,
          note:
            '브라우저·모바일 QR 클라이언트는 동일하게 짧은 deadline 후 재시도하는지 점검하세요.',
        },
        queue: { seeded, renormalized },
        pruned,
      },
      { status: ok ? 200 : 503 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[chaos-monkey] exception', message);
    await chaosSelfHeal(`exception:${message.slice(0, 500)}`);

    try {
      await admin.rpc('chaos_monkey_prune_batch', { p_batch_id: batchId });
    } catch {
      /* best-effort */
    }

    return NextResponse.json(
      {
        ok: false,
        step: 'exception',
        error: message,
        batch_id: batchId,
      },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
