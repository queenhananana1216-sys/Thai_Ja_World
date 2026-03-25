/**
 * Slack Incoming Webhooks — 서버 전용, SSRF 방지(hooks.slack.com 만).
 */

import 'server-only';

export function isAllowedSlackIncomingWebhookUrl(url: string): boolean {
  return url.trim().startsWith('https://hooks.slack.com/');
}

export async function postSlackIncomingWebhook(
  webhookUrl: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; error?: string }> {
  const url = webhookUrl.trim();
  if (!isAllowedSlackIncomingWebhookUrl(url)) {
    return { ok: false, status: 0, error: 'invalid_slack_webhook_host' };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, error: await res.text().then((t) => t.slice(0, 200)) };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
