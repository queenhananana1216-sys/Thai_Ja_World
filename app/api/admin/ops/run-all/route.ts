import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runNewsIngestPipeline } from '@/bots/orchestrator/runNewsIngestPipeline';
import { runKnowledgeCollectLoop } from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { runKnowledgeProcessLoop } from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { runUxOptimizationLoop } from '@/bots/orchestrator/runUxOptimizationLoop';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Body = {
  mode?: 'all' | 'failed_only';
  windowMinutes?: number;
  newsItemsPerFeed?: number;
  newsLimit?: number;
  knowledgeItemsPerSource?: number;
  knowledgeLimit?: number;
};

type StepName =
  | 'news_collect'
  | 'news_process'
  | 'knowledge_collect'
  | 'knowledge_process'
  | 'ux_optimize';

type StepResult = {
  step: StepName;
  skipped: boolean;
  success: boolean;
  run_id?: string;
  error?: string;
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

async function latestBotStatusMap(): Promise<Record<string, string | null>> {
  const admin = createServiceRoleClient();
  const botNames = [
    'news_curator',
    'news_summarizer',
    'knowledge_curator_collect',
    'knowledge_curator_process',
    'ux_admin_optimizer',
  ] as const;
  const { data, error } = await admin
    .from('bot_actions')
    .select('bot_name,status,created_at')
    .in('bot_name', [...botNames])
    .order('created_at', { ascending: false })
    .limit(300);
  if (error || !data) {
    return Object.fromEntries(botNames.map((name) => [name, null]));
  }

  const out: Record<string, string | null> = {};
  for (const name of botNames) out[name] = null;
  for (const row of data as Array<{ bot_name: string; status: string }>) {
    if (row.bot_name in out && out[row.bot_name] === null) {
      out[row.bot_name] = row.status;
    }
  }
  return out;
}

export async function POST(req: Request): Promise<NextResponse> {
  const adminUser = await resolveAdminAccess();
  if (!adminUser) {
    return NextResponse.json(
      { status: 'error', error: '권한이 없습니다. 관리자 계정으로 로그인해 주세요.' },
      { status: 403 },
    );
  }

  let body: Body = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json(
      { status: 'error', error: '요청 본문 JSON 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const mode = body.mode === 'failed_only' ? 'failed_only' : 'all';
  const windowMinutes = clampInt(body.windowMinutes, 5, 60, 15);
  const newsItemsPerFeed = clampInt(body.newsItemsPerFeed, 1, 50, 5);
  const newsLimit = clampInt(body.newsLimit, 1, 30, 5);
  const knowledgeItemsPerSource = clampInt(body.knowledgeItemsPerSource, 1, 20, 5);
  const knowledgeLimit = clampInt(body.knowledgeLimit, 1, 30, 5);
  const idPrefix = `ops-center:${mode}:${randomUUID()}`;

  const latest = mode === 'failed_only' ? await latestBotStatusMap() : null;
  const shouldRun = (botName: string) => mode === 'all' || latest?.[botName] === 'failed';

  const results: StepResult[] = [];

  if (shouldRun('news_curator')) {
    const r = await runNewsIngestPipeline({
      skipProcess: true,
      collect: { itemsPerFeed: newsItemsPerFeed, idempotencyKey: `${idPrefix}:news_collect` },
    });
    results.push({
      step: 'news_collect',
      skipped: false,
      success: Boolean(r.collect.success),
      run_id: r.collect.run_id,
      error: r.collect.error,
    });
  } else {
    results.push({ step: 'news_collect', skipped: true, success: true });
  }

  if (shouldRun('news_summarizer')) {
    const r = await runNewsIngestPipeline({
      skipCollect: true,
      process: { limit: newsLimit, idempotencyKey: `${idPrefix}:news_process` },
    });
    results.push({
      step: 'news_process',
      skipped: false,
      success: Boolean(r.process.success),
      run_id: r.process.run_id,
      error: r.process.error,
    });
  } else {
    results.push({ step: 'news_process', skipped: true, success: true });
  }

  if (shouldRun('knowledge_curator_collect')) {
    const r = await runKnowledgeCollectLoop({
      itemsPerSource: knowledgeItemsPerSource,
      idempotencyKey: `${idPrefix}:knowledge_collect`,
    });
    results.push({
      step: 'knowledge_collect',
      skipped: false,
      success: Boolean(r.success),
      run_id: r.run_id,
      error: r.error,
    });
  } else {
    results.push({ step: 'knowledge_collect', skipped: true, success: true });
  }

  if (shouldRun('knowledge_curator_process')) {
    const r = await runKnowledgeProcessLoop({
      limit: knowledgeLimit,
      idempotencyKey: `${idPrefix}:knowledge_process`,
    });
    results.push({
      step: 'knowledge_process',
      skipped: false,
      success: Boolean(r.success),
      run_id: r.run_id,
      error: r.error,
    });
  } else {
    results.push({ step: 'knowledge_process', skipped: true, success: true });
  }

  if (shouldRun('ux_admin_optimizer')) {
    const r = await runUxOptimizationLoop(windowMinutes);
    results.push({
      step: 'ux_optimize',
      skipped: false,
      success: r.ok,
      run_id: r.run_id,
      error: r.error,
    });
  } else {
    results.push({ step: 'ux_optimize', skipped: true, success: true });
  }

  const success = results.every((r) => r.success);
  return NextResponse.json({
    status: success ? 'ok' : 'partial',
    mode,
    actor: adminUser.email,
    results,
  });
}

