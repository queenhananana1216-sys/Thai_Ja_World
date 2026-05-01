import { NextResponse } from 'next/server';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 포털 CTA — 로그인 사용자에게 `onboarding_first_post_500` quest_instances 1행 보장.
 * 비로그인 401 은 클라이언트에서 무시하고 글쓰기로 이동.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const sb = await createServerSupabaseAuthClient();
    const {
      data: { user },
      error: authErr,
    } = await sb.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, reason: 'AUTH_REQUIRED' }, { status: 401 });
    }

    const { data, error } = await sb.rpc('quest_ensure_onboarding_first_post_instance');
    if (error) {
      const missing = error.message.includes('function') && error.message.includes('does not exist');
      if (missing) {
        return NextResponse.json({ ok: false, reason: 'RPC_NOT_DEPLOYED' }, { status: 503 });
      }
      return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Error';
    return NextResponse.json({ ok: false, reason: message }, { status: 500 });
  }
}
