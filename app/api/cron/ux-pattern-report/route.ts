/**
 * Motherbrain UX 패턴 알림 — site_analytics(이탈·초단기 체류) + publish_logs(ui_incident 에러 창).
 * 이상 패턴 시 motherbrain-heal 자동 트리거 (Bearer CRON_SECRET).
 */
import { randomUUID } from 'crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cronAuth';
import { createServiceRoleClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MIN = 110;
const GOLDEN = ['/news', '/tips', '/korean-biz', '/community/boards', '/shop', '/local'] as const;

/** 골든 경로에서 체류가 이 구간이면 “즉시 이탈”로 간주 (ms) */
const SNAP_BOUNCE_MIN = 180;
const SNAP_BOUNCE_MAX = 2400;

function siteBase(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://127.0.0.1:3000';
  return raw.replace(/\/+$/, '');
}

async function triggerHeal(
  secret: string,
  reason: string,
  details: Record<string, unknown>,
): Promise<number | null> {
  try {
    const res = await fetch(`${siteBase()}/api/health/motherbrain-heal`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        deep: true,
        pathname: '/',
        pipeline_error_retention_hours: 72,
        reason,
        details,
      }),
      cache: 'no-store',
    });
    return res.status;
  } catch {
    return 0;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: false, error: 'MISSING_SERVICE_ROLE' }, { status: 503 });
  }

  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const admin = createServiceRoleClient();

  const { data, error } = await admin
    .from('site_analytics')
    .select('kind,route,dwell_ms,session_id')
    .gte('recorded_at', since)
    .in('kind', ['view', 'dwell'])
    .order('recorded_at', { ascending: false })
    .limit(3500);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  type R = { kind: string; route: string | null; dwell_ms: number | null; session_id: string | null };
  const dwellByRoute: Record<string, { total: number; n: number }> = {};
  const viewsByRoute: Record<string, number> = {};
  let snapBounceGolden = 0;

  for (const row of (data ?? []) as R[]) {
    const route = typeof row.route === 'string' ? row.route : '/';
    if (row.kind === 'view') viewsByRoute[route] = (viewsByRoute[route] ?? 0) + 1;
    if (row.kind === 'dwell' && typeof row.dwell_ms === 'number' && row.dwell_ms > 0) {
      const curr = dwellByRoute[route] ?? { total: 0, n: 0 };
      curr.total += row.dwell_ms;
      curr.n += 1;
      dwellByRoute[route] = curr;

      const isGolden = (GOLDEN as readonly string[]).includes(route);
      if (
        isGolden &&
        row.dwell_ms >= SNAP_BOUNCE_MIN &&
        row.dwell_ms <= SNAP_BOUNCE_MAX
      ) {
        snapBounceGolden += 1;
      }
    }
  }

  const suspects: { route: string; avgDwell: number; views: number }[] = [];

  for (const g of GOLDEN) {
    const hit = dwellByRoute[g];
    const views = viewsByRoute[g] ?? 0;
    if (!hit || hit.n < 2) continue;
    const avg = hit.total / hit.n;
    if (views >= 4 && avg > 0 && avg < 4200) {
      suspects.push({ route: g, avgDwell: Math.round(avg), views });
    }
  }

  const { count: uiIncidentCountRaw, error: uiErr } = await admin
    .from('publish_logs')
    .select('*', { count: 'exact', head: true })
    .eq('channel', 'ui_incident')
    .gte('published_at', since);

  const uiIncidentCount = typeof uiIncidentCountRaw === 'number' ? uiIncidentCountRaw : 0;

  if (uiErr) {
    console.warn('[ux-pattern-report] ui_incident count failed:', uiErr.message);
  }

  const secret = process.env.CRON_SECRET?.trim() || process.env.BOT_CRON_SECRET?.trim();
  /** 에러 바운더리 1건이라도 나오면 즉시 힐 후보 · 초단기 이탈이 많거나 기존 suspect 다중 */
  /** 임계값 낮춤 — 이미지 23류(길목 혼잡) 징후가 보이면 크론 측에서도 즉시 motherbrain-heal 호출 */
  const shouldHeal =
    !!secret &&
    (uiIncidentCount >= 1 ||
      snapBounceGolden >= 5 ||
      suspects.length >= 2 ||
      (suspects.length >= 1 && snapBounceGolden >= 3));

  let healStatus: number | null = null;
  if (shouldHeal) {
    healStatus = await triggerHeal(secret!, 'motherbrain_ux_pattern_report', {
      suspects,
      window_min: WINDOW_MIN,
      snap_bounce_golden: snapBounceGolden,
      ui_incident_reports: uiIncidentCount,
      golden_routes: GOLDEN,
      snap_bounce_ms_range: [SNAP_BOUNCE_MIN, SNAP_BOUNCE_MAX],
    });
  }

  const { error: insErr } = await admin.from('publish_logs').insert({
    channel: 'motherbrain_pattern_report',
    target_type: 'cron',
    target_id: randomUUID(),
    meta: {
      at: new Date().toISOString(),
      window_min: WINDOW_MIN,
      suspects,
      snap_bounce_golden: snapBounceGolden,
      ui_incident_reports: uiIncidentCount,
      heal_requested: shouldHeal,
      heal_http_status: healStatus,
    },
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    suspect_count: suspects.length,
    snap_bounce_golden: snapBounceGolden,
    ui_incident_reports: uiIncidentCount,
    heal_requested: shouldHeal,
    heal_http_status: healStatus,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return GET(req);
}
