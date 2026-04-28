import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc('minihome_expire_rentals_and_reset');
    if (error) throw new Error(error.message);
    return NextResponse.json({ status: 'ok', expired: Number(data ?? 0) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[API /api/cron/rental-expiry]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
