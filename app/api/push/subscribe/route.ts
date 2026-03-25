/**
 * POST /api/push/subscribe
 * Authorization: Bearer <access_token>
 * Body: { subscription: { endpoint, keys: { p256dh, auth } } }
 */
import { NextResponse } from 'next/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

type SubKeys = { p256dh?: string; auth?: string };

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = m?.[1]?.trim() ?? '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const sub = b.subscription as Record<string, unknown> | undefined;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.trim() : '';
  const keys = sub?.keys as SubKeys | undefined;
  const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : '';
  const authKey = typeof keys?.auth === 'string' ? keys.auth.trim() : '';

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ ok: false, error: 'invalid_subscription' }, { status: 400 });
  }

  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: ue,
  } = await sb.auth.getUser();
  if (ue || !user) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }

  const { error } = await sb.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth_key: authKey,
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
