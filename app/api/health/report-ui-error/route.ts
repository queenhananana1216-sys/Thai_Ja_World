/**
 * POST — 클라이언트 Error Boundary 가 감지한 렌더링 오류를 기록하고 오너 핫라인(LINE/Slack)을 격발합니다.
 * 선택 헤더: x-tj-ui-incident-key — UI_INCIDENT_INGEST_KEY 와 일치할 때만 허용(미설정 시 검증 생략).
 */
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { notifyOwnerOmniCritical } from '@/lib/ops/ownerOmniHotline';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_CHARS = 14_000;

export async function POST(req: Request): Promise<NextResponse> {
  const expected = process.env.UI_INCIDENT_INGEST_KEY?.trim();
  const sent = req.headers.get('x-tj-ui-incident-key')?.trim();
  if (expected && sent !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!raw || typeof raw !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const source = typeof o.source === 'string' ? o.source.slice(0, 64) : 'unknown';
  const message = typeof o.message === 'string' ? o.message.slice(0, 4000) : '';
  const digest = typeof o.digest === 'string' ? o.digest.slice(0, 128) : null;
  const pathname = typeof o.pathname === 'string' ? o.pathname.slice(0, 1024) : '';

  const admin = createServiceRoleClient();
  const { error: insErr } = await admin.from('publish_logs').insert({
    channel: 'ui_incident',
    target_type: 'client_error',
    target_id: randomUUID(),
    meta: {
      source,
      message: message || '(empty)',
      digest,
      pathname,
      at: new Date().toISOString(),
    },
  });

  if (insErr) {
    console.error('[report-ui-error] publish_logs insert:', insErr.message);
    return NextResponse.json({ ok: false, error: 'log_failed' }, { status: 503 });
  }

  const fingerprint = `ui:${digest ?? message.slice(0, 120)}`;
  try {
    await notifyOwnerOmniCritical({
      kind: 'ui_render',
      fingerprint,
      detail: `${source} ${pathname} — ${message.slice(0, 280)}`,
    });
  } catch (e) {
    console.error('[report-ui-error] hotline failed:', e);
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
