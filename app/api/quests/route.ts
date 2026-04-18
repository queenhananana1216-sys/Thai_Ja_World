import { NextResponse } from 'next/server';
import { createSupabaseWithUserJwt } from '@/lib/supabase/userJwtClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bearer(req: Request): string {
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m?.[1]?.trim() ?? '';
}

export async function GET(req: Request): Promise<NextResponse> {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = createSupabaseWithUserJwt(token);

  const {
    data: { user },
    error: userError,
  } = await sb.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status')?.trim() || '';
  const limitRaw = Number(url.searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

  let query = sb
    .from('quest_instances')
    .select(
      'id,quest_code,period_key,goal_count,progress_count,reward_corn,status,completed_at,rewarded_at,held_at,hold_reason,created_at,quest_definitions(title_ko,title_th,period_type,event_type)',
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ quests: data ?? [] });
}
