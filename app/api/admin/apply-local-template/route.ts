import { NextResponse } from 'next/server';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { applyLocalAiTemplate, type VisionApplyPayload } from '@/lib/admin/applyLocalAiTemplate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isMenuItemRow(v: unknown): boolean {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.price !== 'string') return false;
  const hasLegacy = typeof o.name === 'string' && o.name.trim().length > 0;
  const hasQuad = (['name_ko', 'name_th', 'name_en', 'name_zh'] as const).some(
    (k) => typeof o[k] === 'string' && String(o[k]).trim().length > 0,
  );
  return hasLegacy || hasQuad;
}

function isVisionPayload(v: unknown): v is VisionApplyPayload {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.vibe_summary === 'string' &&
    Array.isArray(o.vibe_tags) &&
    typeof o.selected_skin_basic_id === 'string' &&
    (o.selected_skin_special_id === null || typeof o.selected_skin_special_id === 'string') &&
    typeof o.selected_bgm_id === 'string' &&
    Array.isArray(o.menu_items) &&
    (o.menu_items as unknown[]).every(isMenuItemRow) &&
    typeof o.notes === 'string'
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const localSpotId = typeof rec.localSpotId === 'string' ? rec.localSpotId.trim() : '';
  const vision = rec.vision ?? rec.result;

  if (!localSpotId || !isVisionPayload(vision)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  try {
    const applied = await applyLocalAiTemplate({ localSpotId, vision });
    return NextResponse.json({ ok: true, ...applied });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes('not_found') ? 404 : msg.includes('missing') ? 422 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
