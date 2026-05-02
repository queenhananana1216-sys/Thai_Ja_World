import { type NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import { votesToPublicIntPct } from '@/lib/polls/votesToPublicIntPct';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function readPublicPct(admin: ReturnType<typeof createServiceRoleClient>, pollId: string) {
  const { data: totRaw } = await admin.rpc('get_public_poll_totals', { p_poll_id: pollId });
  const totRow = Array.isArray(totRaw) ? totRaw[0] : totRaw;
  const votesA = Number((totRow as { votes_a?: unknown })?.votes_a ?? 0);
  const votesB = Number((totRow as { votes_b?: unknown })?.votes_b ?? 0);
  return votesToPublicIntPct(votesA, votesB);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  let body: { pollId?: unknown; choice?: unknown; anonId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const pollId = typeof body.pollId === 'string' ? body.pollId.trim() : '';
  const choiceRaw = body.choice === 'b' ? 'b' : 'a';
  const anonRaw = typeof body.anonId === 'string' ? body.anonId.trim() : '';

  if (!pollId || !UUID_RE.test(pollId)) {
    return NextResponse.json({ ok: false, error: 'bad_poll' }, { status: 400 });
  }

  const sbUser = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sbUser.auth.getUser();

  let voterKey: string;
  if (user?.id) {
    voterKey = `user:${user.id.toLowerCase()}`;
  } else {
    const aid = anonRaw.toLowerCase();
    if (!aid || !UUID_RE.test(aid)) {
      return NextResponse.json({ ok: false, error: 'anon_required' }, { status: 400 });
    }
    voterKey = `anon:${aid}`;
  }

  const admin = createServiceRoleClient();

  const { error } = await admin.from('poll_votes').insert({
    poll_id: pollId,
    voter_key: voterKey,
    choice: choiceRaw,
  });

  if (error?.code === '23505') {
    const { data: existing } = await admin
      .from('poll_votes')
      .select('choice')
      .eq('poll_id', pollId)
      .eq('voter_key', voterKey)
      .maybeSingle();

    const my = existing?.choice === 'b' ? 'b' : existing?.choice === 'a' ? 'a' : choiceRaw;
    const { pctA, pctB } = await readPublicPct(admin, pollId);
    return NextResponse.json({
      ok: true,
      duplicate: true,
      myChoice: my,
      pctA,
      pctB,
    });
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
  }

  const { pctA, pctB } = await readPublicPct(admin, pollId);
  revalidatePath('/');

  return NextResponse.json({
    ok: true,
    myChoice: choiceRaw,
    pctA,
    pctB,
  });
}
