import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: spots, error: spotErr } = await admin
    .from('local_spots')
    .select('id,name')
    .eq('owner_profile_id', user.id)
    .limit(10);
  if (spotErr) {
    return NextResponse.json({ error: spotErr.message }, { status: 500 });
  }
  const ids = (spots ?? []).map((s) => s.id);
  if (ids.length === 0) return NextResponse.json({ leads: [] });

  const { data: leads, error: leadErr } = await admin
    .from('shop_order_leads')
    .select('id,spot_id,customer_name,phone,status,requested_time,created_at,menu_snapshot')
    .in('spot_id', ids)
    .order('created_at', { ascending: false })
    .limit(40);
  if (leadErr) {
    return NextResponse.json({ error: leadErr.message }, { status: 500 });
  }

  const byId = new Map((spots ?? []).map((s) => [s.id, s.name]));
  return NextResponse.json({
    leads: (leads ?? []).map((lead) => ({
      ...lead,
      spot_name: byId.get(lead.spot_id) ?? '가게',
    })),
  });
}
