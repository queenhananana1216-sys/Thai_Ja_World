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
  const { sb } = authed;

  const url = new URL(req.url);
  const roomId = url.searchParams.get('room_id')?.trim() ?? '';
  const limitRaw = Number(url.searchParams.get('limit') ?? '80');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(150, Math.floor(limitRaw))) : 80;
  if (!roomId) return NextResponse.json({ error: 'room_id' }, { status: 400 });

  const { data, error } = await sb
    .from('chat_messages')
    .select('id,room_id,author_id,body,is_deleted,created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((data ?? []).map((r) => r.author_id).filter(Boolean))];
  let names: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await sb.from('profiles').select('id,display_name').in('id', ids);
    names = (profiles ?? []).reduce<Record<string, string>>((acc, p) => {
      acc[p.id as string] = ((p.display_name as string) || '').trim() || 'member';
      return acc;
    }, {});
  }

  return NextResponse.json({ messages: data ?? [], names });
}

export async function POST(req: Request) {
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
  const roomId = typeof b.room_id === 'string' ? b.room_id.trim() : '';
  const text = typeof b.body === 'string' ? b.body.trim() : '';
  if (!roomId || text.length < 1 || text.length > 1000) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('chat_messages')
    .insert({
      room_id: roomId,
      author_id: user.id,
      body: text,
    })
    .select('id,created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: data });
}
