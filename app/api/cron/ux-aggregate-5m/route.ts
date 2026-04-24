/**
 * GET /api/cron/ux-aggregate-5m — 5분 창으로 ux_events 를 집계해 ux_metrics_5m 에 upsert
 * (스키마: supabase/migrations/078_ux_tracking_and_flags.sql)
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PATH_BUCKETS = [
  '/',
  '/landing',
  '/news',
  '/tips',
  '/community/boards',
  '/local',
  '/minihome',
] as const;

function windowStart5m(d: Date): Date {
  const t = d.getTime();
  const step = 5 * 60 * 1000;
  return new Date(Math.floor(t / step) * step);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const win = windowStart5m(new Date());
  const since = new Date(win.getTime() - 5 * 60 * 1000).toISOString();

  try {
    const admin = createServiceRoleClient();
    const { data: rows, error: fetchErr } = await admin
      .from('ux_events')
      .select('path, event_type')
      .gte('created_at', since)
      .lt('created_at', win.toISOString());
    if (fetchErr) {
      return NextResponse.json({ status: 'error', error: fetchErr.message }, { status: 500 });
    }

    const totals: Record<string, number> = {};
    for (const p of PATH_BUCKETS) {
      for (const ev of ['page_view', 'click', 'dead_click', 'js_error', 'api_error'] as const) {
        totals[`${p}::${ev}`] = 0;
      }
    }

    for (const r of rows ?? []) {
      const path = typeof r.path === 'string' ? r.path : '';
      const ev = typeof r.event_type === 'string' ? r.event_type : '';
      const norm =
        path === '/landing' || path === '/'
          ? '/'
          : PATH_BUCKETS.find((b) => path === b || path.startsWith(`${b}/`)) ?? 'other';
      if (norm === 'other') continue;
      const key = `${norm}::${ev}`;
      if (key in totals) {
        const t = totals as Record<string, number>;
        t[key] = (t[key] ?? 0) + 1;
      }
    }

    const { error: upErr } = await admin.from('ux_metrics_5m').upsert(
      { window_start: win.toISOString(), totals: totals as unknown as Record<string, unknown> },
      { onConflict: 'window_start' },
    );
    if (upErr) {
      return NextResponse.json({ status: 'error', error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      window_start: win.toISOString(),
      event_rows: (rows ?? []).length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal Server Error';
    console.error('[API /api/cron/ux-aggregate-5m]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
