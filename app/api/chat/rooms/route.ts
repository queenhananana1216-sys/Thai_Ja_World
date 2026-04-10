import { NextResponse } from 'next/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'auth' }, { status: 401 });

  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: ue,
  } = await sb.auth.getUser();
  if (ue || !user) return NextResponse.json({ error: 'auth' }, { status: 401 });

  const { data, error } = await sb
    .from('chat_rooms')
    .select('id,slug,title,description')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rooms: data ?? [] });
}
