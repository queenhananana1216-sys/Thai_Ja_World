import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createServiceRoleClient } from '@/lib/supabase/admin';

const FAILURE_REPEAT_THRESHOLD = 3;
const PAUSE_MINUTES = 15;

type JsonRecord = Record<string, unknown>;

/** DB `publish_logs.target_id` 가 uuid 일 때 문자열 pipeline slug 를 넣을 수 없어 SHA1 기반 결정적 UUID 로 매핑 */
function publishLogTargetUuid(pipelineId: string): string {
  const h = createHash('sha1').update(`tj:cron_pipeline:${pipelineId}`).digest();
  const b = Buffer.alloc(16);
  h.copy(b, 0, 0, 16);
  b[6] = (b[6]! & 0x0f) | 0x50;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export async function logCronEvent(params: {
  pipelineId: string;
  event: string;
  status: 'success' | 'failed' | 'delayed' | 'paused' | 'fallback';
  meta?: JsonRecord;
}) {
  const admin = createServiceRoleClient();
  await admin.from('publish_logs').insert({
    channel: 'cron_pipeline',
    target_type: 'cron_pipeline',
    target_id: publishLogTargetUuid(params.pipelineId),
    meta: {
      event: params.event,
      status: params.status,
      at: nowIso(),
      pipeline_slug: params.pipelineId,
      ...(params.meta ?? {}),
    },
  });
}

export async function findActivePause(pipelineId: string): Promise<{ pausedUntil: string; reason: string } | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('publish_logs')
    .select('meta, published_at')
    .eq('channel', 'cron_pipeline')
    .eq('target_type', 'cron_pipeline')
    .eq('target_id', publishLogTargetUuid(pipelineId))
    .order('published_at', { ascending: false })
    .limit(30);

  for (const row of data ?? []) {
    const meta = row.meta as JsonRecord;
    if (meta?.event === 'force_resume') {
      return null;
    }
    if (meta?.event !== 'self_heal_pause') continue;
    const pausedUntil = String(meta.paused_until ?? '');
    const reason = String(meta.reason ?? 'repeated_failure');
    if (!pausedUntil) continue;
    if (Date.parse(pausedUntil) > Date.now()) return { pausedUntil, reason };
  }
  return null;
}

async function countRepeatedFailures(pipelineId: string, reason: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('publish_logs')
    .select('meta, published_at')
    .eq('channel', 'cron_pipeline')
    .eq('target_type', 'cron_pipeline')
    .eq('target_id', publishLogTargetUuid(pipelineId))
    .order('published_at', { ascending: false })
    .limit(60);

  let count = 0;
  for (const row of data ?? []) {
    const meta = row.meta as JsonRecord;
    if (meta?.status !== 'failed') continue;
    if (String(meta.reason ?? '') === reason) count += 1;
  }
  return count;
}

export async function registerFailureAndSelfHeal(params: {
  pipelineId: string;
  event: string;
  reason: string;
  retryCount?: number;
}) {
  await logCronEvent({
    pipelineId: params.pipelineId,
    event: params.event,
    status: 'failed',
    meta: {
      reason: params.reason,
      retry_count: params.retryCount ?? 0,
    },
  });

  const repeated = await countRepeatedFailures(params.pipelineId, params.reason);
  if (repeated < FAILURE_REPEAT_THRESHOLD) return { paused: false, repeated };

  const pausedUntilIso = new Date(Date.now() + PAUSE_MINUTES * 60_000).toISOString();
  await logCronEvent({
    pipelineId: params.pipelineId,
    event: 'self_heal_pause',
    status: 'paused',
    meta: {
      reason: params.reason,
      repeated_failures: repeated,
      paused_until: pausedUntilIso,
    },
  });

  return { paused: true, repeated, pausedUntilIso };
}

export function pausedResponse(pipelineId: string, pausedUntil: string, reason: string) {
  return NextResponse.json(
    {
      status: 'paused',
      pipeline: pipelineId,
      reason,
      paused_until: pausedUntil,
      fallback: 'enabled',
    },
    { status: 429 },
  );
}
