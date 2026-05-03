import { NextResponse } from 'next/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const pathRaw =
    body !== null && typeof body === 'object' && 'path' in body
      ? String((body as { path?: unknown }).path ?? '')
      : '';
  const path = pathRaw.trim().slice(0, 2048);
  if (!path) {
    return NextResponse.json({ error: 'path_required' }, { status: 400 });
  }

  try {
    const sb = await createServerSupabaseAuthClient();
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr || !user?.id) {
      return NextResponse.json({ ok: false, skipped: 'no_session' }, { status: 401 });
    }

    const { error } = await sb.from('user_activity_logs').insert({
      profile_id: user.id,
      event_type: 'page_view',
      path,
    });

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return NextResponse.json({ ok: true, skipped: 'table_missing' });
      }
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
