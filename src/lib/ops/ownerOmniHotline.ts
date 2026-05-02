import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { sendLineNotifyMessage } from '@/lib/orders/lineNotify';

const DEDUPE_MS = 120_000;
const HOTLINE_TARGET_ID = '00000000-0000-0000-0000-000000000001';

export const OWNER_OMNI_CRITICAL_PREFIX = '🚨 [긴급] 글쓰기 로직 뻗음! 즉시 복구 요망!';

export type OwnerOmniHotlineKind = 'shadow_qa' | 'ui_render';

async function recentDuplicateAlert(fingerprint: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - DEDUPE_MS).toISOString();
  const { data, error } = await admin
    .from('publish_logs')
    .select('id')
    .eq('channel', 'owner_hotline')
    .eq('target_type', 'omni_alert')
    .eq('target_id', HOTLINE_TARGET_ID)
    .filter('meta->>fingerprint', 'eq', fingerprint)
    .gte('published_at', since)
    .limit(1);

  if (error) {
    console.warn('[ownerOmniHotline] dedupe lookup failed:', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

async function recordHotlineSent(fingerprint: string, kind: OwnerOmniHotlineKind): Promise<void> {
  const admin = createServiceRoleClient();
  await admin.from('publish_logs').insert({
    channel: 'owner_hotline',
    target_type: 'omni_alert',
    target_id: HOTLINE_TARGET_ID,
    meta: {
      fingerprint,
      kind,
      sent_at: new Date().toISOString(),
    },
  });
}

async function sendSlack(text: string): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhook?.startsWith('https://hooks.slack.com/')) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*[TaejaWorld Omni]*\n${text.slice(0, 3500)}` }),
    });
  } catch (e) {
    console.warn('[ownerOmniHotline] slack failed:', e);
  }
}

/**
 * 쉐도우 QA 실패·UI 렌더 실패 시 오너 LINE(및 Slack) 핫라인. 2분 내 동일 fingerprint 는 중복 전송 안 함.
 */
export async function notifyOwnerOmniCritical(params: {
  kind: OwnerOmniHotlineKind;
  fingerprint: string;
  detail: string;
}): Promise<void> {
  const { kind, fingerprint, detail } = params;
  const token =
    process.env.OWNER_OMNI_LINE_NOTIFY_TOKEN?.trim() ||
    process.env.LINE_NOTIFY_DEFAULT_TOKEN?.trim() ||
    '';

  if (await recentDuplicateAlert(fingerprint)) {
    return;
  }

  const kindLabel = kind === 'shadow_qa' ? '쉐도우 QA(백엔드·board_posts)' : 'UI 렌더링(클라이언트 Error Boundary)';
  const body = [
    OWNER_OMNI_CRITICAL_PREFIX,
    '',
    `유형: ${kindLabel}`,
    `상세: ${detail.slice(0, 500)}`,
    '',
    `시각(UTC): ${new Date().toISOString()}`,
  ].join('\n');

  const parallel: Promise<unknown>[] = [sendSlack(body)];
  if (token) parallel.push(sendLineNotifyMessage(token, body));
  const results = await Promise.all(parallel);

  if (token) {
    const lineResult = results[1] as Awaited<ReturnType<typeof sendLineNotifyMessage>>;
    if (lineResult && !lineResult.ok) {
      console.error('[ownerOmniHotline] LINE send failed', lineResult);
    }
  }

  try {
    await recordHotlineSent(fingerprint, kind);
  } catch (e) {
    console.warn('[ownerOmniHotline] record sent log failed:', e);
  }
}
