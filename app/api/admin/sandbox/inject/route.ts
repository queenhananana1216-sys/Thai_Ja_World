/**
 * POST /api/admin/sandbox/inject — 제안 → active_scripts 주입(런타임 실행 대상)
 */
import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gate = await resolveAdminAccess();
  if (!gate) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { proposalId?: string };
  try {
    body = (await request.json()) as { proposalId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : '';
  if (!proposalId) {
    return NextResponse.json({ error: 'proposalId_required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: proposal, error: pErr } = await admin
    .from('sandbox_script_proposals')
    .select('id,title,language,code_text,pipeline_kind')
    .eq('id', proposalId)
    .maybeSingle();

  if (pErr || !proposal) {
    return NextResponse.json({ error: pErr?.message ?? 'proposal_not_found' }, { status: 404 });
  }

  const slug = `proposal-${proposal.id}`;
  const title = typeof proposal.title === 'string' ? proposal.title : 'Untitled pipeline';

  const scriptRow = {
    slug,
    title,
    language: typeof proposal.language === 'string' ? proposal.language : 'typescript',
    code_text: typeof proposal.code_text === 'string' ? proposal.code_text : '',
    hook_target: 'cron' as const,
    enabled: true,
    proposal_id: proposal.id,
    updated_at: new Date().toISOString(),
    metadata: {
      pipeline_kind: proposal.pipeline_kind ?? null,
      injected_at: new Date().toISOString(),
      injected_by: 'admin_sandbox',
    },
  };

  const { error: uErr } = await admin.from('active_scripts').upsert(scriptRow, { onConflict: 'slug' });
  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  const { error: sErr } = await admin
    .from('sandbox_script_proposals')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', proposalId);

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug });
}
