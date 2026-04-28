import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_ENDPOINTS: Record<string, string> = {
  'cron/news': '/api/cron/news',
  'cron/content-automation': '/api/cron/content-automation',
  'cron/knowledge': '/api/cron/knowledge',
  'cron/knowledge-stubs': '/api/cron/knowledge-stubs',
  'cron/home-copy': '/api/cron/home-copy',
  'cron/quests': '/api/cron/quests',
  'cron/ops-monitor': '/api/cron/ops-monitor',
  'cron/ux-bot': '/api/cron/ux-bot',
  'cron/rental-expiry': '/api/cron/rental-expiry',
  'cron/purge-news': '/api/cron/purge-news',
  'cron/purge-bot-actions': '/api/cron/purge-bot-actions',
  'cron/push-daily-digest': '/api/cron/push-daily-digest',
  'cron/post-deploy-smoke': '/api/cron/post-deploy-smoke',
  'cron/local-shop-template-pipeline': '/api/cron/local-shop-template-pipeline',
};

function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return 'http://127.0.0.1:3000';
}

export async function POST(req: Request) {
  const adminUser = await resolveAdminAccess();
  if (!adminUser) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { pipelineId?: string } | null;
  const pipelineId = String(body?.pipelineId ?? '').trim();
  if (!pipelineId) return NextResponse.json({ error: 'pipelineId가 필요합니다.' }, { status: 400 });
  const endpoint = CRON_ENDPOINTS[pipelineId];
  if (!endpoint) return NextResponse.json({ error: '지원하지 않는 pipelineId 입니다.' }, { status: 400 });

  const admin = createServiceRoleClient();
  await admin.from('publish_logs').insert({
    channel: 'cron_pipeline',
    target_type: 'cron_pipeline',
    target_id: pipelineId,
    meta: {
      event: 'force_resume',
      status: 'success',
      reason: 'owner_force_resume',
      actor: adminUser.email,
      at: new Date().toISOString(),
    },
  });

  const secret = process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim() || '';
  const triggerRes = await fetch(`${siteOrigin()}${endpoint}`, {
    method: 'POST',
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    cache: 'no-store',
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    pipelineId,
    trigger: triggerRes ? `http_${triggerRes.status}` : 'trigger_failed',
  });
}
