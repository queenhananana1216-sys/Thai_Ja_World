import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import {
  buildDailyWebPushPayload,
  type ProcessedNewsDigestRow,
} from '@/lib/push/digestFromProcessed';

function normalizeNewsRowForDigest(row: unknown): ProcessedNewsDigestRow | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  if (!id) return null;

  let title: string | null = null;
  const rn = r.raw_news;
  if (rn && typeof rn === 'object' && !Array.isArray(rn)) {
    const t = (rn as { title?: unknown }).title;
    title = typeof t === 'string' ? t : null;
  } else if (Array.isArray(rn) && rn[0] && typeof rn[0] === 'object') {
    const t = (rn[0] as { title?: unknown }).title;
    title = typeof t === 'string' ? t : null;
  }

  const summaries = Array.isArray(r.summaries)
    ? (r.summaries as { summary_text: string; model: string | null }[])
    : null;

  return {
    id,
    clean_body: typeof r.clean_body === 'string' ? r.clean_body : null,
    raw_news: { title },
    summaries,
  };
}

function configureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  const contact = process.env.VAPID_CONTACT_EMAIL?.trim() || 'mailto:hello@thaijaworld.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  return true;
}

type SubRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export type DailyPushResult = {
  configured: boolean;
  skippedReason?: string;
  newsFound: boolean;
  subscriptions: number;
  sent: number;
  removedDead: number;
  errors: number;
};

export async function sendDailyWebPushDigest(origin: string): Promise<DailyPushResult> {
  const result: DailyPushResult = {
    configured: false,
    newsFound: false,
    subscriptions: 0,
    sent: 0,
    removedDead: 0,
    errors: 0,
  };

  if (!configureVapid()) {
    result.skippedReason = 'vapid_not_configured';
    return result;
  }
  result.configured = true;

  const admin = createServiceRoleClient();

  const { data: newsRow, error: newsErr } = await admin
    .from('processed_news')
    .select(
      'id, clean_body, raw_news(title), summaries(summary_text, model)',
    )
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (newsErr || !newsRow) {
    result.skippedReason = newsErr?.message ?? 'no_news';
    return result;
  }

  const digestRow = normalizeNewsRowForDigest(newsRow);
  const payload = digestRow ? buildDailyWebPushPayload(digestRow, origin) : null;
  if (!payload) {
    result.skippedReason = 'empty_digest';
    return result;
  }
  result.newsFound = true;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  });

  const { data: subs, error: subErr } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key');

  if (subErr || !subs?.length) {
    result.skippedReason = subErr?.message ?? 'no_subscribers';
    result.subscriptions = 0;
    return result;
  }

  result.subscriptions = subs.length;

  for (const s of subs as SubRow[]) {
    const pushSub = {
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth_key },
    };

    try {
      await webpush.sendNotification(pushSub, body, {
        TTL: 86_400,
        urgency: 'normal',
      });
      result.sent += 1;
    } catch (e: unknown) {
      const status = typeof e === 'object' && e !== null && 'statusCode' in e
        ? (e as { statusCode?: number }).statusCode
        : undefined;
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id);
        result.removedDead += 1;
      } else {
        result.errors += 1;
      }
    }
  }

  return result;
}
