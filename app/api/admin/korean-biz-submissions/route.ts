import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from('korean_biz_submissions')
      .select(
        'id, name, address, phone, suggested_category, suggested_region, status, submitter_note, admin_note, created_at, reviewed_at, submitted_by',
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: { id?: string; status?: string; admin_note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : '';
  if (!id || !['approved', 'rejected', 'merged', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'invalid_patch' }, { status: 400 });
  }

  const adminNote =
    typeof body.admin_note === 'string' ? body.admin_note.trim().slice(0, 1000) : null;

  try {
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from('korean_biz_submissions')
      .update({
        status,
        admin_note: adminNote,
        reviewed_at: status === 'pending' ? null : now,
      })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
