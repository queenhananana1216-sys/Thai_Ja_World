/**
 * POST /api/health/motherbrain-heal
 * 글로벌/세그먼트 에러 복구용 — 주요 라우트 ISR(revalidatePath) + (선택) PostgREST 스키마 NOTIFY.
 *
 * 클라이언트: report-ui-error 와 동일하게 x-tj-ui-incident-key 가 설정된 경우에만 허용.
 * 크론·운영: Authorization: Bearer CRON_SECRET + JSON { "deep": true } 시 RPC chaos_monkey_notify_pgrst_reload_schema.
 */
import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { revalidateMotherbrainPaths } from '@/lib/server/motherbrainRevalidate';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 4000;

export async function POST(req: Request): Promise<NextResponse> {
  const expected = process.env.UI_INCIDENT_INGEST_KEY?.trim();
  const sent = req.headers.get('x-tj-ui-incident-key')?.trim();
  const cronDeep = isCronAuthorized(req.headers.get('authorization'));

  if (expected && sent !== expected && !cronDeep) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  let pathname: string | undefined;
  let deep = false;
  if (text.trim()) {
    try {
      const o = JSON.parse(text) as Record<string, unknown>;
      if (typeof o.pathname === 'string') pathname = o.pathname;
      if (o.deep === true) deep = true;
    } catch {
      return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }
  }

  const n = revalidateMotherbrainPaths(pathname);

  let pgrst_ok: boolean | null = null;
  if (deep && cronDeep) {
    const admin = createServiceRoleClient();
    const { error } = await admin.rpc('chaos_monkey_notify_pgrst_reload_schema');
    pgrst_ok = !error;
    if (error) {
      console.error('[motherbrain-heal] pgrst reload rpc failed', error.message);
    }
  }

  return NextResponse.json({
    ok: true,
    revalidated_paths: n,
    deep_pgrst: deep && cronDeep ? pgrst_ok : null,
  });
}
