import { NextResponse } from 'next/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, reason: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  let locale = 'ko';
  try {
    const body = (await req.json()) as { locale?: string };
    if (body?.locale === 'th') locale = 'th';
  } catch {
    /* body 없음 → ko */
  }

  const { data, error } = await sb.rpc('claim_daily_thailand_fortune', { p_locale: locale });
  if (error) {
    return NextResponse.json(
      { ok: false, reason: 'RPC_ERROR', message: error.message },
      { status: 500 },
    );
  }

  const payload = data as Record<string, unknown> | null;
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, reason: 'EMPTY_RESPONSE' }, { status: 500 });
  }

  return NextResponse.json(payload);
}
