/**
 * Motherbrain 뉴스 정체 해소 — 마지막 공개 한국어 기사가 STALE_HOURS 이상 갱신 없으면
 * RSS 수집 + 가공 루프(기본 150건까지, 429·LLM 백오프는 summarize 루틴에 위임).
 *
 * GET Authorization: Bearer CRON_SECRET
 *
 * 쿼리: staleHours=24&targetPublished=150 (optional)
 */
import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { runProcessNewsLoop } from '@/bots/orchestrator/runProcessNewsLoop';
import { isCronAuthorized } from '@/lib/cronAuth';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { revalidateMotherbrainPaths } from '@/lib/server/motherbrainRevalidate';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 플랜 한도 초과 방지 — 부족 시 NEWS_UNSTICK_MAX_ROUNDS 로 완화 */
export const maxDuration = 300;

const PIPELINE_ID = 'cron/news-stagnation-relief';
const DEFAULT_STALE_HOURS = 24;
const DEFAULT_TARGET_PUBLISHED = 129;
const PROCESS_CHUNK = 30;
const BATCH_PAUSE_MS = Math.max(
  600,
  Number(process.env.NEWS_UNSTICK_BATCH_PAUSE_MS ?? '3200') || 3200,
);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  /** 운영 기본: 24h 미만으로는 정체 판단 완화 금지(엄격 적용). */
  let staleH = Math.floor(Number(searchParams.get('staleHours') ?? String(DEFAULT_STALE_HOURS)));
  if (!Number.isFinite(staleH) || staleH < DEFAULT_STALE_HOURS) staleH = DEFAULT_STALE_HOURS;
  if (staleH > 168) staleH = 168;

  let targetPublished = Math.floor(
    Number(searchParams.get('targetPublished') ?? String(DEFAULT_TARGET_PUBLISHED)),
  );
  if (!Number.isFinite(targetPublished) || targetPublished < 12) targetPublished = DEFAULT_TARGET_PUBLISHED;
  if (targetPublished > 260) targetPublished = 260;

  const paused = await findActivePause('cron/news');
  if (paused) {
    await logCronEvent({ pipelineId: PIPELINE_ID, event: 'news_unstick', status: 'fallback', meta: { mode: 'pause_skip_news' } });
    return pausedResponse(PIPELINE_ID, paused.pausedUntil, paused.reason);
  }

  const admin = createServiceRoleClient();
  const staleCut = new Date(Date.now() - staleH * 3600 * 1000).toISOString();

  const { data: newestKo, error: newestErr } = await admin
    .from('processed_news')
    .select('created_at')
    .eq('published', true)
    .eq('language', 'ko')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (newestErr) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'news_unstick',
      status: 'failed',
      meta: { phase: 'staleness_probe', error: newestErr.message },
    });
    return NextResponse.json({ ok: false, error: newestErr.message }, { status: 500 });
  }

  const lastAt = newestKo?.created_at ? new Date(String(newestKo.created_at)) : null;
  const isStale = !lastAt || Number.isNaN(lastAt.getTime()) || lastAt.getTime() < new Date(staleCut).getTime();

  if (!isStale) {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'news_unstick',
      status: 'success',
      meta: {
        skipped: true,
        reason: 'fresh_enough',
        last_ko_processed_at: lastAt?.toISOString() ?? null,
        stale_hours_threshold: staleH,
      },
    });
    return NextResponse.json({
      ok: true,
      skipped: true,
      last_ko_processed_at: lastAt?.toISOString() ?? null,
      stale_hours_threshold: staleH,
    });
  }

  const ageMs = lastAt ? Date.now() - lastAt.getTime() : Number.POSITIVE_INFINITY;
  const hoursSinceKo = ageMs === Number.POSITIVE_INFINITY ? 999 : ageMs / 3600000;
  /** 대시보드가 5일(120h) 이상 그대로였다면 수집·가공 폭을 단계적으로 확대 */
  const severeStuck = hoursSinceKo >= 120;

  let effTarget = targetPublished;
  if (severeStuck) {
    effTarget = Math.max(effTarget, 165);
  }

  let maxRoundsEnv = Math.floor(Number(process.env.NEWS_UNSTICK_MAX_ROUNDS ?? '5') || 5);
  if (severeStuck) maxRoundsEnv = Math.max(maxRoundsEnv, 6);

  let rounds = Math.min(Math.min(8, Math.max(1, maxRoundsEnv)), Math.ceil(effTarget / PROCESS_CHUNK));

  let itemsPerFeed = Math.min(
    50,
    Math.max(
      14,
      Number(process.env.NEWS_UNSTICK_ITEMS_PER_FEED ?? '22') || 22,
    ),
  );
  if (severeStuck) {
    itemsPerFeed = Math.min(50, itemsPerFeed + 12);
    rounds = Math.min(8, Math.max(rounds, Math.ceil(Math.max(effTarget, 150) / PROCESS_CHUNK)));
  }

  try {
    const collectResult = await runNewsIngestPipeline({
      collect: { itemsPerFeed },
      skipProcess: true,
    });

    const processRuns: Awaited<ReturnType<typeof runProcessNewsLoop>>[] = [];
    let publishedApprox = 0;

    for (let i = 0; i < rounds; i++) {
      const one = await runProcessNewsLoop({
        limit: PROCESS_CHUNK,
        idempotencyKey: `news-unstick-${Math.floor(Date.now() / 3_600_000)}-${i}`,
      });
      processRuns.push(one);
      const out = one.output as { succeeded?: number } | undefined;
      const batchOk = typeof out?.succeeded === 'number' ? out.succeeded : 0;
      publishedApprox += batchOk;
      if (one.success === false || batchOk === 0) {
        break;
      }
      await sleep(BATCH_PAUSE_MS);
    }

    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'news_unstick',
      status: 'success',
      meta: {
        last_ko_processed_at_before: lastAt?.toISOString() ?? null,
        stale_hours_threshold: staleH,
        hours_since_last_ko: Math.round(hoursSinceKo * 10) / 10,
        severe_stuck_boost: severeStuck,
        target_published_effective: effTarget,
        rounds,
        collect_success: collectResult.collect.success,
        process_runs: processRuns.length,
        published_approx: publishedApprox,
      },
    });

    if (publishedApprox > 0) {
      try {
        revalidateMotherbrainPaths('/news');
      } catch (e) {
        console.warn('[news-stagnation-relief] revalidateMotherbrainPaths:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      skipped: false,
      stale_hours_threshold: staleH,
      hours_since_last_ko: Math.round(hoursSinceKo * 10) / 10,
      severe_stuck_boost: severeStuck,
      last_ko_processed_at_before: lastAt?.toISOString() ?? null,
      collect: collectResult.collect,
      process_rounds: processRuns,
      published_approx: publishedApprox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[news-stagnation-relief]', message);
    await registerFailureAndSelfHeal({
      pipelineId: PIPELINE_ID,
      event: 'news_unstick',
      reason: message.toLowerCase().includes('timeout')
        ? 'news_unstick_timeout'
        : 'news_unstick_failed',
      retryCount: 1,
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
