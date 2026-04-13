import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { UxTrackEvent } from '@/lib/ux/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function asEventArray(input: unknown): UxTrackEvent[] {
  const raw = input as { events?: unknown };
  if (!Array.isArray(raw?.events)) return [];
  const out: UxTrackEvent[] = [];
  for (const item of raw.events) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const sessionId = String(e.session_id ?? '').trim();
    const locale = e.locale === 'th' ? 'th' : 'ko';
    const path = String(e.path ?? '').trim().slice(0, 200);
    const eventType = String(e.event_type ?? '').trim();
    if (!sessionId || !path) continue;
    if (!['page_view', 'click', 'dead_click', 'js_error', 'api_error'].includes(eventType)) continue;
    out.push({
      session_id: sessionId.slice(0, 64),
      locale,
      path,
      event_type: eventType as UxTrackEvent['event_type'],
      target_text: typeof e.target_text === 'string' ? e.target_text.slice(0, 140) : undefined,
      target_role: typeof e.target_role === 'string' ? e.target_role.slice(0, 40) : undefined,
      meta: e.meta && typeof e.meta === 'object' && !Array.isArray(e.meta) ? (e.meta as Record<string, unknown>) : {},
    });
  }
  return out.slice(0, 80);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const events = asEventArray(body);
  if (events.length === 0) return NextResponse.json({ ok: true, inserted: 0 });

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from('ux_events').insert(events);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, inserted: events.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server_error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

