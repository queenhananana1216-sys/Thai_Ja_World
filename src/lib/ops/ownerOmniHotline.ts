import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/admin';
import { sendLineNotifyMessage } from '@/lib/orders/lineNotify';

const DEDUPE_MS = 120_000;
const HOTLINE_TARGET_ID = '00000000-0000-0000-0000-000000000001';

const BRAND = '태국에, 살자';

export type OwnerOmniHotlineKind = 'shadow_qa' | 'ui_render' | 'e2e_integrity';

/** 하위 호환 — 문구만 브랜드 톤으로 교체됨 */
export const OWNER_OMNI_CRITICAL_PREFIX = `🐘 [${BRAND}] 커뮤니티 흐름에 잠시 걸림이 있어요. 곧 다시 편안한 화면으로 돌아옵니다.`;

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
      body: JSON.stringify({
        text: `*[${BRAND} · 요새 소식]* 🐘\n${text.slice(0, 3500)}`,
      }),
    });
  } catch (e) {
    console.warn('[ownerOmniHotline] slack failed:', e);
  }
}

/**
 * 광장·화면 이슈 시 오너 LINE/Slack — 기계어 대신 생활 포털 톤, 2분 내 동일 지문은 생략.
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

  const headline =
    kind === 'e2e_integrity'
      ? `🐘 [${BRAND}] 길목이 한때 붐볐어요 · 순찰이 지켜본 내용입니다`
      : OWNER_OMNI_CRITICAL_PREFIX;

  const kindLabel =
    kind === 'shadow_qa'
      ? '광장 순찰(글과 화면이 잘 연결되는지)'
      : kind === 'e2e_integrity'
        ? '한 시간마다 도는 라이브 순찰(느린 길·끊긴 페이지)'
        : '화면 복구(Error Boundary 가 포착한 내용)';

  const body = [
    headline,
    '',
    `무슨 일이었나요: ${kindLabel}`,
    `자세히: ${detail.slice(0, 500)}`,
    '',
    `(UTC) ${new Date().toISOString()}`,
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
