import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { dismissBizUpdateProposal } from '@/lib/korean-biz/applyBizUpdateProposal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  if (!(await resolveAdminAccess())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { proposalId?: string };
  try {
    body = (await req.json()) as { proposalId?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const proposalId = typeof body.proposalId === 'string' ? body.proposalId.trim() : '';
  if (!proposalId) return NextResponse.json({ error: 'proposalId_required' }, { status: 400 });

  const result = await dismissBizUpdateProposal(proposalId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
