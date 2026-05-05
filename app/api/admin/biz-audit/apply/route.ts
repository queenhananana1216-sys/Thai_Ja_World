import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { applyBizUpdateProposal } from '@/lib/korean-biz/applyBizUpdateProposal';
import { tryCreateServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  if (!(await resolveAdminAccess())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sb = await tryCreateServerSupabaseAuthClient();
  if (!sb) return NextResponse.json({ error: 'no_session' }, { status: 401 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { proposalId?: string };
  try {
    body = (await req.json()) as { proposalId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : '';
  if (!proposalId) return NextResponse.json({ error: 'proposalId_required' }, { status: 400 });

  const result = await applyBizUpdateProposal({ proposalId, profileId: user.id });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
