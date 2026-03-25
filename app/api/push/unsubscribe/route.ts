/**
 * POST /api/push/unsubscribe
 * Authorization: Bearer <access_token>
 * Body: { endpoint: string } (omit = delete all for user)
 */
import { NextResponse } from 'next/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  const token = m?.[1]?.trim() ?? '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }
  const b = body as Record<string, unknown>;
  const endpoint = typeof b.endpoint === 'string' ? b.endpoint.trim() : '';

  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: ue,
  } = await sb.auth.getUser();
  if (ue || !user) {
    return NextResponse.json({ ok: false, error: 'auth' }, { status: 401 });
  }

  let q = sb.from('push_subscriptions').delete().eq('user_id', user.id);
  if (endpoint) q = q.eq('endpoint', endpoint);
  const { error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
