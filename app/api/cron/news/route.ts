/**
 * GET /api/cron/news — Vercel Cron 전용 (수집 + 요약 한 번에)
 *
 * vercel.json 스케줄: UTC 기준 4시간마다 — 표현식은 저장소 루트 vercel.json 의 crons 항목과 동일.
 *
 * Vercel 대시보드에서 같은 이름의 CRON_SECRET 을 설정하면
 * 요청 헤더 Authorization: Bearer <CRON_SECRET> 으로 검증됩니다.
 *
 * 쿼리 (선택): itemsPerFeed=10&limit=8 | status=1&job_id=UUID (비동기 작업 폴링)
 *
 * Vercel(`VERCEL=1`)에서는 기본 **비동기(HTTP 202)** — `after()`로 파이프라인을 이어 실행합니다.
 * 동기 스모크가 필요하면 `sync=1` 을 붙이세요. 로컬에서는 기본 동기이며, `deferred=1`로 202 동작을 시험할 수 있습니다.
 */

import { randomUUID } from 'node:crypto';
import { type NextRequest, NextResponse, after } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { purgeStubRows, type PurgeStubRowsResult } from '@/lib/news/purgeStubRows';
import {
  formatProbeForConsole,
  probeSupabaseConnectivity,
} from '@/lib/supabase/connectivityProbe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Vercel 플랜 한도 내 최대 — 기본 10~15초 초과 방지 (collect/process 장시간 허용) */
export const maxDuration = 300;

const MAX_ITEMS = 50;
const MAX_LIMIT = 30;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
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

  const { searchParams } = new URL(req.url);
  const collectOpts: { itemsPerFeed?: number } = {};
  const processOpts: { limit?: number } = {};

  const ipf = searchParams.get('itemsPerFeed');
  if (ipf) {
    const n = Math.floor(Number(ipf));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_ITEMS) collectOpts.itemsPerFeed = n;
  }

  const lim = searchParams.get('limit');
  if (lim) {
    const n = Math.floor(Number(lim));
    if (Number.isFinite(n) && n >= 1 && n <= MAX_LIMIT) processOpts.limit = n;
  }

  const statusPoll = searchParams.get('status') === '1';
  const jobIdPoll = searchParams.get('job_id')?.trim();
  if (statusPoll) {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('publish_logs')
      .select('published_at, meta')
      .eq('channel', 'cron_pipeline')
      .eq('target_type', 'cron_pipeline')
      .order('published_at', { ascending: false })
      .limit(120);
    if (error) {
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }
    type PublishMeta = Record<string, unknown>;
    const isNewsCronRow = (meta: PublishMeta) =>
      meta?.route === '/api/cron/news' ||
      meta?.pipeline_slug === 'cron/news' ||
      (meta?.event === 'news_fetch' && typeof meta?.job_id === 'string');
    const rows = (data ?? [])
      .map((r) => ({
        published_at: r.published_at as string,
        meta: (r.meta ?? {}) as PublishMeta,
      }))
      .filter((r) => isNewsCronRow(r.meta));
    const filtered =
      jobIdPoll && jobIdPoll.length > 0
        ? rows.filter((r) => String(r.meta?.job_id ?? '') === jobIdPoll)
        : rows;
    const latestDeferred = filtered.find(
      (r) =>
        r.meta?.mode === 'deferred_done' ||
        r.meta?.mode === 'deferred_error' ||
        r.meta?.mode === 'deferred_queued',
    );
    return NextResponse.json({
      status: 'ok',
      ...(jobIdPoll ? { job_id: jobIdPoll } : {}),
      recent: filtered.slice(0, 15),
      latest_deferred: latestDeferred ?? null,
    });
  }

  const doPurge = searchParams.get('purge') === '1' || searchParams.get('purge_stubs') === '1';
  let purgeResult: PurgeStubRowsResult | undefined;
  if (doPurge) {
    const purgeProbe = await probeSupabaseConnectivity();
    if (
      purgeProbe.status === 'paused' ||
      purgeProbe.status === 'dns_error' ||
      purgeProbe.status === 'network_error'
    ) {
      console.error(formatProbeForConsole(purgeProbe));
      return NextResponse.json(
        {
          status: 'error',
          error: 'SUPABASE_UNREACHABLE',
          probe: purgeProbe,
          hint: purgeProbe.ownerAction,
        },
        { status: 503 },
      );
    }
    try {
      purgeResult = await purgeStubRows();
      if (searchParams.get('purge_only') === '1') {
        return NextResponse.json({ status: 'ok', purge: purgeResult });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ status: 'error', error: 'PURGE_FAILED', message }, { status: 500 });
    }
  }

  const pipelineId = 'cron/news';
  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'news_fetch', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  const forceSync = searchParams.get('sync') === '1';
  const onVercel = Boolean(process.env.VERCEL);
  /** 프로덕션(Vercel)에서는 기본 비동기 — HTTP 504·함수 타임아웃 회피. `sync=1`이면 기존 동기 파이프라인. */
  const useDeferred = onVercel ? !forceSync : searchParams.get('deferred') === '1';

  if (useDeferred) {
    const jobId = randomUUID();
    await logCronEvent({
      pipelineId,
      event: 'news_fetch',
      status: 'delayed',
      meta: {
        mode: 'deferred_queued',
        job_id: jobId,
        route: '/api/cron/news',
        collect: collectOpts,
        process: processOpts,
      },
    });

    after(async () => {
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
            mode: 'deferred_done',
            job_id: jobId,
            route: '/api/cron/news',
            collect: collectRun,
            process: summarizeRun,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal Server Error';
        console.error('[API /api/cron/news deferred]', message);
        await logCronEvent({
          pipelineId,
          event: 'news_fetch',
          status: 'failed',
          meta: {
            mode: 'deferred_error',
            job_id: jobId,
            route: '/api/cron/news',
            error: message.slice(0, 800),
          },
        });
        await registerFailureAndSelfHeal({
          pipelineId,
          event: 'news_fetch',
          reason: message.toLowerCase().includes('timeout') ? 'news_api_timeout' : 'news_fetch_failed',
          retryCount: 1,
        });
      }
    });

    return NextResponse.json(
      {
        status: 'accepted',
        deferred: true,
        job_id: jobId,
        poll: '/api/cron/news?status=1',
        hint: '백그라운드에서 수집·가공이 이어집니다. 상태: GET /api/cron/news?status=1&job_id=<id> 로 폴링.',
      },
      { status: 202 },
    );
  }

  const probe = await probeSupabaseConnectivity();
  if (probe.status !== 'ok') {
    console.error(formatProbeForConsole(probe));
    return NextResponse.json(
      {
        status: 'error',
        error: 'SUPABASE_UNREACHABLE',
        probe,
        hint: probe.ownerAction,
      },
      { status: 503 },
    );
  }

  try {
    const { collect: collectRun, process: summarizeRun } = await runNewsIngestPipeline({
      collect: collectOpts,
      process: processOpts,
    });
    await logCronEvent({ pipelineId, event: 'news_fetch', status: 'success', meta: { route: '/api/cron/news' } });
    return NextResponse.json({
      status: 'ok',
      ...(purgeResult ? { purge: purgeResult } : {}),
      collect: collectRun,
      process: summarizeRun,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/cron/news]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'news_fetch',
      reason: message.toLowerCase().includes('timeout') ? 'news_api_timeout' : 'news_fetch_failed',
      retryCount: 1,
    });
    return NextResponse.json({ status: 'error', error: 'Internal Server Error' }, { status: 500 });
  }
}
