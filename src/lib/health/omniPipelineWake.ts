import 'server-only';

import { randomUUID } from 'crypto';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

const WAKE_COOLDOWN_MS = 55 * 60 * 1000;

function probeOrigin(): string | null {
  const v = process.env.VERCEL_URL?.trim();
  if (v) {
    const host = v.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * 핫이슈(공개 뉴스)가 오래됐을 때 통합 파이프라인을 한 번 깨운다.
 * CRON_SECRET 미설정·쿨다운 중이면 no-op (Vercel Cron과 중복 폭주 방지).
 */
export function maybeWakeUnifiedPipelineForStaleFeed(reason: string): void {
  if (!isServiceRoleConfigured()) return;
  const secret = process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  if (!secret) return;
  const origin = probeOrigin();
  if (!origin) return;

  const sb = createServiceRoleClient();
  const sinceIso = new Date(Date.now() - WAKE_COOLDOWN_MS).toISOString();

  void (async () => {
    try {
      const { data: recent, error: qErr } = await sb
        .from('publish_logs')
        .select('id')
        .eq('channel', 'system_health')
        .eq('target_type', 'omni_radar')
        .gte('published_at', sinceIso)
        .limit(1);
      if (qErr || (recent?.length ?? 0) > 0) return;

      const url = `${origin}/api/cron/pipeline?newsLimit=16&knowledgeLimit=12`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(120_000),
      });
      await sb.from('publish_logs').insert({
        channel: 'system_health',
        target_type: 'omni_radar',
        target_id: randomUUID(),
        meta: {
          event: 'pipeline_wake',
          reason: reason.slice(0, 240),
          http_status: res.status,
          at: new Date().toISOString(),
        },
      });
    } catch (e) {
      try {
        await sb.from('publish_logs').insert({
          channel: 'system_health',
          target_type: 'omni_radar',
          target_id: randomUUID(),
          meta: {
            event: 'pipeline_wake_failed',
            reason: reason.slice(0, 240),
            message: (e instanceof Error ? e.message : String(e)).slice(0, 400),
            at: new Date().toISOString(),
          },
        });
      } catch {
        /* no-op */
      }
    }
  })();
}
