import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const adminGate = await resolveAdminAccess();
  if (!adminGate) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sb = createServiceRoleClient();
  const { data, error } = await sb
    .from('biz_update_proposals')
    .select(
      'id,proposal_kind,current_value,proposed_value,witty_headline,witty_sub,created_at,audit_batch_id,korean_business_id,metadata,korean_businesses(name,region,category,google_place_id)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data ?? [] });
}
