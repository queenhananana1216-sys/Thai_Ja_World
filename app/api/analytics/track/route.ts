/**
 * POST /api/analytics/track — 클라이언트 행동 로그 (서비스 롤 삽입)
 * 과도한 트래픽 완화: 이벤트 배열 최대 32건, route 길이 제한
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_EVENTS = 32;
const MAX_ROUTE_LEN = 280;

type IncomingEvent = {
  kind?: unknown;
  route?: unknown;
  dwell_ms?: unknown;
  ts?: unknown;
  meta?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body === null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const sessionId =
    typeof (body as { sessionId?: unknown }).sessionId === 'string'
      ? String((body as { sessionId: string }).sessionId).slice(0, 80)
      : 'anonymous';

  const rawEvents = (body as { events?: unknown }).events;
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return NextResponse.json({ error: 'events_required' }, { status: 400 });
  }

  const slice = rawEvents.slice(0, MAX_EVENTS);
  const rows: {
    kind: 'view' | 'click' | 'dwell';
    route: string;
    dwell_ms: number | null;
    session_id: string;
    meta: Record<string, unknown>;
  }[] = [];

  for (const ev of slice as IncomingEvent[]) {
    const kind = ev?.kind === 'view' || ev?.kind === 'click' || ev?.kind === 'dwell' ? ev.kind : null;
    if (!kind) continue;
    const route =
      typeof ev.route === 'string' ? ev.route.slice(0, MAX_ROUTE_LEN) : '/';
    let dwell_ms: number | null = null;
    if (kind === 'dwell' && typeof ev.dwell_ms === 'number' && Number.isFinite(ev.dwell_ms)) {
      dwell_ms = Math.min(Math.max(Math.floor(ev.dwell_ms), 0), 86_400_000);
    }
    const extraMeta =
      ev.meta !== null &&
      typeof ev.meta === 'object' &&
      !Array.isArray(ev.meta) &&
      !(ev.meta instanceof Date)
        ? (ev.meta as Record<string, unknown>)
        : {};
    rows.push({
      kind,
      route,
      dwell_ms,
      session_id: sessionId,
      meta:
        typeof ev.ts === 'number'
          ? { ts: ev.ts, ...extraMeta }
          : { ...extraMeta },
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'no_valid_events' }, { status: 400 });
  }

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('site_analytics').insert(
      rows.map((r) => ({
        kind: r.kind,
        route: r.route,
        dwell_ms: r.dwell_ms,
        session_id: r.session_id,
        meta: r.meta,
      })),
    );
    if (error) {
      console.warn('[analytics/track]', error.message);
      return NextResponse.json({ error: 'insert_failed' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[analytics/track]', msg);
    return NextResponse.json({ error: 'server_error' }, { status: 502 });
  }
}
