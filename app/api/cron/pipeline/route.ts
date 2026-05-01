/**
 * GET /api/cron/pipeline — 통합 배치 (매시간 Cron)
 * ① 태국 뉴스 RSS 수집 + LLM 요약·번역 → processed_news
 * ② 비자/생활 지식 소스 수집·가공 → processed_knowledge 파이프라인
 *
 * 기존 `/api/cron/news`, `/api/cron/knowledge` 오케스트레이터를 순차 호출합니다.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { runKnowledgeCollectLoop } from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { runKnowledgeStubRepairLoop } from '@/bots/orchestrator/runKnowledgeStubRepairLoop';
import { isCronAuthorized } from '@/lib/cronAuth';
import {
  findActivePause,
  logCronEvent,
  pausedResponse,
  registerFailureAndSelfHeal,
} from '@/lib/cron/omniLogger';
import { pingGoogleSitemap } from '@/lib/seo/googleSitemapPing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** 통합 배치(뉴스+knowledge) — 단일 요청 내 순차 실행 시간 확보 */
export const maxDuration = 300;

const pipelineId = 'cron/pipeline';

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const paused = await findActivePause(pipelineId);
  if (paused) {
    await logCronEvent({ pipelineId, event: 'pipeline_unified', status: 'fallback', meta: { mode: 'pause_skip' } });
    return pausedResponse(pipelineId, paused.pausedUntil, paused.reason);
  }

  const { searchParams } = new URL(req.url);
  const ipf = Math.min(Math.max(Math.floor(Number(searchParams.get('itemsPerFeed') ?? '8')), 1), 40);
  const nLim = Math.min(Math.max(Math.floor(Number(searchParams.get('newsLimit') ?? '8')), 1), 30);
  const ips = Math.min(Math.max(Math.floor(Number(searchParams.get('itemsPerSource') ?? '5')), 1), 20);
  const kLim = Math.min(Math.max(Math.floor(Number(searchParams.get('knowledgeLimit') ?? '6')), 1), 30);
  const stubLim = Math.min(Math.max(Math.floor(Number(searchParams.get('stubLimit') ?? '4')), 1), 12);

  const hourUtc = new Date().toISOString().slice(0, 13);
  const newsCollectKey = `pipeline-hourly-news-collect-${hourUtc}`;
  const newsProcessKey = `pipeline-hourly-news-process-${hourUtc}`;
  const knowledgeCollectKey = `pipeline-hourly-knowledge-collect-${hourUtc}`;
  const knowledgeProcessKey = `pipeline-hourly-knowledge-process-${hourUtc}`;

  try {
    const news = await runNewsIngestPipeline({
      collect: { idempotencyKey: newsCollectKey, itemsPerFeed: ipf },
      process: { idempotencyKey: newsProcessKey, limit: nLim },
    });

    const collectRun = await runKnowledgeCollectLoop({
      idempotencyKey: knowledgeCollectKey,
      itemsPerSource: ips,
    });

    const processRun = await runKnowledgeProcessLoop({
      idempotencyKey: knowledgeProcessKey,
      limit: kLim,
    });

    let stubRepairRun: Awaited<ReturnType<typeof runKnowledgeStubRepairLoop>> | { skipped: true; reason: string };
    if (searchParams.get('stubRepair') === '0') {
      stubRepairRun = { skipped: true, reason: 'stubRepair=0' };
    } else {
      stubRepairRun = await runKnowledgeStubRepairLoop({ limit: stubLim });
    }

    const newsOut = news.process.output as { succeeded?: number } | undefined;
    const newsSucceeded = typeof newsOut?.succeeded === 'number' ? newsOut.succeeded : 0;
    const knowOut = processRun.output as { processed?: number } | undefined;
    const knowledgeProcessed = typeof knowOut?.processed === 'number' ? knowOut.processed : 0;
    const shouldPingSitemap = newsSucceeded > 0 || knowledgeProcessed > 0;

    let sitemapPing: { ok: boolean; status?: number; error?: string; skipped?: boolean } = {
      ok: false,
      skipped: true,
    };
    if (shouldPingSitemap) {
      sitemapPing = await pingGoogleSitemap();
    }

    await logCronEvent({
      pipelineId,
      event: 'pipeline_unified',
      status: 'success',
      meta: {
        route: '/api/cron/pipeline',
        news_collect: news.collect.run_id,
        news_process: news.process.run_id,
        knowledge_collect: collectRun.run_id,
        knowledge_process: processRun.run_id,
        sitemap_ping: shouldPingSitemap ? sitemapPing : { skipped: true },
      },
    });

    return NextResponse.json({
      status: 'ok',
      news: {
        collect: news.collect,
        process: news.process,
      },
      knowledge: {
        collect: collectRun,
        process: processRun,
        stub_repair: stubRepairRun,
      },
      seo: {
        sitemap_ping: shouldPingSitemap ? sitemapPing : { skipped: true, reason: 'no_new_processed_content' },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'pipeline_failed';
    console.error('[API /api/cron/pipeline]', message);
    await registerFailureAndSelfHeal({
      pipelineId,
      event: 'pipeline_unified',
      reason: message.toLowerCase().includes('timeout') ? 'pipeline_timeout' : 'pipeline_failed',
      retryCount: 1,
    });
    await logCronEvent({
      pipelineId,
      event: 'pipeline_unified',
      status: 'failed',
      meta: { error: message },
    });
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
