import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const pollId = req.nextUrl.searchParams.get('pollId')?.trim() ?? '';
  const anonId = req.nextUrl.searchParams.get('anonId')?.trim() ?? '';

  if (!pollId || !UUID_RE.test(pollId)) {
    return NextResponse.json({ ok: false, error: 'bad_poll' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: totRaw } = await admin.rpc('get_public_poll_totals', { p_poll_id: pollId });
  const totRow = Array.isArray(totRaw) ? totRaw[0] : totRaw;
  const votesA = Number((totRow as { votes_a?: unknown })?.votes_a ?? 0);
  const votesB = Number((totRow as { votes_b?: unknown })?.votes_b ?? 0);

  const sbUser = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sbUser.auth.getUser();

  let myChoice: 'a' | 'b' | null = null;
  if (user?.id) {
    const { data: row } = await admin
      .from('poll_votes')
      .select('choice')
      .eq('poll_id', pollId)
      .eq('voter_key', `user:${user.id.toLowerCase()}`)
      .maybeSingle();
    if (row?.choice === 'a' || row?.choice === 'b') myChoice = row.choice;
  } else if (anonId && UUID_RE.test(anonId.toLowerCase())) {
    const { data: row } = await admin
      .from('poll_votes')
      .select('choice')
      .eq('poll_id', pollId)
      .eq('voter_key', `anon:${anonId.toLowerCase()}`)
      .maybeSingle();
    if (row?.choice === 'a' || row?.choice === 'b') myChoice = row.choice;
  }

  return NextResponse.json({
    ok: true,
    votesA: Number.isFinite(votesA) ? votesA : 0,
    votesB: Number.isFinite(votesB) ? votesB : 0,
    myChoice,
  });
}
