/**
 * Contact-Check-Bot — `korean_businesses` 의 LINE·WhatsApp URL 응답을 주기적으로 점검해
 * `contact_link_ok` / `contact_checked_at` 를 갱신합니다. Authorization: Bearer CRON_SECRET
 */
import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { probeAndPersistKoreanBizContacts } from '@/lib/korean-biz/probeKoreanBizContactUrls';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BATCH = 48;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { data: withLine, error: e1 } = await admin
    .from('korean_businesses')
    .select('id, line_url, whatsapp_url, contact_checked_at')
    .not('line_url', 'is', null)
    .order('contact_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH);
  const { data: withWa, error: e2 } = await admin
    .from('korean_businesses')
    .select('id, line_url, whatsapp_url, contact_checked_at')
    .not('whatsapp_url', 'is', null)
    .order('contact_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH);

  const err = e1 ?? e2;
  if (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }

  const byId = new Map<string, { id: string; line_url: string | null; whatsapp_url: string | null }>();
  for (const row of [...(withLine ?? []), ...(withWa ?? [])]) {
    byId.set(String(row.id), {
      id: String(row.id),
      line_url: typeof row.line_url === 'string' ? row.line_url : null,
      whatsapp_url: typeof row.whatsapp_url === 'string' ? row.whatsapp_url : null,
    });
  }
  const list = [...byId.values()].slice(0, BATCH);
  const checked: string[] = [];
  const now = new Date().toISOString();

  for (const row of list) {
    const id = String(row.id);
    const line = typeof row.line_url === 'string' ? row.line_url.trim() : '';
    const wa = typeof row.whatsapp_url === 'string' ? row.whatsapp_url.trim() : '';
    const targets = [line, wa].filter((u) => /^https?:\/\//i.test(u));
    if (!targets.length) continue;

    const ok = await probeAndPersistKoreanBizContacts(id);
    if (ok) checked.push(id);
  }

  return NextResponse.json({
    ok: true,
    scanned: list.length,
    updated: checked.length,
    at: now,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
