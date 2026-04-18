import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const adminUser = await resolveAdminAccess();
  if (!adminUser) {
    return NextResponse.json({ status: 'error', error: 'Forbidden' }, { status: 403 });
  }

  const sb = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  const [instances, completed, claimed, held, rewardsToday] = await Promise.all([
    sb.from('quest_instances').select('*', { count: 'exact', head: true }),
    sb.from('quest_instances').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    sb.from('quest_instances').select('*', { count: 'exact', head: true }).eq('status', 'claimed'),
    sb.from('quest_instances').select('*', { count: 'exact', head: true }).eq('status', 'held'),
    sb
      .from('quest_reward_ledger')
      .select('reward_corn')
      .eq('status', 'granted')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`),
  ]);

  const rewardCornToday = (rewardsToday.data ?? []).reduce((sum, row) => {
    const amount = typeof row.reward_corn === 'number' ? row.reward_corn : 0;
    return sum + amount;
  }, 0);

  return NextResponse.json({
    status: 'ok',
    actor: adminUser.email,
    summary: {
      total_instances: instances.count ?? 0,
      completed_instances: completed.count ?? 0,
      claimed_instances: claimed.count ?? 0,
      held_instances: held.count ?? 0,
      reward_corn_today: rewardCornToday,
    },
  });
}
