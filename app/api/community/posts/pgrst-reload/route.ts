/**
 * POST /api/community/posts/pgrst-reload
 * 로그인 사용자만 — 글 등록 재시도 소진 후 PostgREST 스키마 캐시 갱신(NOTIFY)용.
 * chaos_monkey_notify_pgrst_reload_schema 와 동일 경로(카오스 몽키 셀프힐 RPC).
 */
import { NextResponse } from 'next/server';
import { logCronEvent } from '@/lib/cron/omniLogger';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PIPELINE_ID = 'cron/chaos-monkey';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  const token = m?.[1]?.trim() ?? '';
  if (!token) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const sb = createSupabaseWithUserJwt(token);
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { error: rpcErr } = await admin.rpc('chaos_monkey_notify_pgrst_reload_schema');
  if (rpcErr) {
    console.error('[pgrst-reload] chaos_monkey_notify_pgrst_reload_schema failed', rpcErr.message);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  try {
    await logCronEvent({
      pipelineId: PIPELINE_ID,
      event: 'chaos_monkey_self_heal',
      status: 'success',
      meta: {
        reason: 'client_post_submit_exhausted_retries',
        trigger: 'pgrst-reload-api',
        user_id: user.id,
      },
    });
  } catch (e) {
    console.error('[pgrst-reload] logCronEvent failed', e);
  }

  return NextResponse.json({ ok: true });
}
