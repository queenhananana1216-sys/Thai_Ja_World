import { NextResponse } from 'next/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

async function getAuthedClient(req: Request) {
  const token = bearer(req);
  if (!token) return { error: 'auth' as const };
  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error,
  } = await sb.auth.getUser();
  if (error || !user) return { error: 'auth' as const };
  return { sb, user };
}

export async function GET(req: Request) {
  const authed = await getAuthedClient(req);
  if ('error' in authed) return NextResponse.json({ error: authed.error }, { status: 401 });
  const { sb, user } = authed;

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get('unread') === '1';
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

  let query = sb
    .from('notifications')
    .select('id,source_type,source_id,title,body,href,is_read,created_at,read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(req: Request) {
  const authed = await getAuthedClient(req);
  if ('error' in authed) return NextResponse.json({ error: authed.error }, { status: 401 });
  const { sb, user } = authed;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const markAllRead = b.markAllRead === true;
  const ids = Array.isArray(b.ids) ? b.ids.map((x) => String(x)).filter(Boolean) : [];

  let query = sb
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (markAllRead) {
    query = query.eq('is_read', false);
  } else if (ids.length > 0) {
    query = query.in('id', ids);
  } else {
    return NextResponse.json({ error: 'ids_or_markAllRead_required' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
