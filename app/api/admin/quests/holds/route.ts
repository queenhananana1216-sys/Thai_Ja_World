import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const adminUser = await resolveAdminAccess();
  if (!adminUser) {
    return NextResponse.json({ status: 'error', error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status')?.trim() || 'pending';
  const limitRaw = Number(url.searchParams.get('limit') ?? '100');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, Math.floor(limitRaw))) : 100;
  const sb = createServiceRoleClient();

  const { data, error } = await sb
    .from('quest_reward_holds')
    .select('id,profile_id,quest_instance_id,hold_reason,risk_score,review_status,reviewed_by,reviewed_at,created_at')
    .eq('review_status', status)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: 'ok',
    actor: adminUser.email,
    holds: data ?? [],
  });
}
