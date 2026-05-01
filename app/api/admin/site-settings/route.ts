/**
 * 오너 전용 — site_settings upsert (service role)
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { resolveAdminAccess } from '@/lib/admin/resolveAdminAccess';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import type { TextScale } from '@/lib/site-settings/siteUiSettings';
import type { Json } from '../../../../supabase/types';

export const runtime = 'nodejs';

const ALLOWED_KEYS = new Set([
  'ui.text_scale',
  'ui.hide_ai_chrome',
  'ui.weather_widget_enabled',
  'health.safe_mode',
]);

export async function GET(): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.from('site_settings').select('key, value, updated_at').order('key');
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  const gate = await resolveAdminAccess();
  if (!gate) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const entries =
    body !== null && typeof body === 'object' && 'updates' in body && Array.isArray((body as { updates: unknown }).updates)
      ? (body as { updates: { key?: unknown; value?: unknown }[] }).updates
      : body !== null && typeof body === 'object' && 'key' in body && 'value' in body
        ? [
            {
              key: (body as Record<string, unknown>).key,
              value: (body as Record<string, unknown>).value,
            },
          ]
        : null;

  if (!entries?.length) {
    return NextResponse.json({ error: 'expected { updates: [{ key, value }] } or { key, value }' }, { status: 400 });
  }

  const rows: { key: string; value: unknown }[] = [];
  for (const u of entries) {
    const key = typeof u?.key === 'string' ? u.key.trim() : '';
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json({ error: `key_not_allowed: ${key}` }, { status: 400 });
    }
    const val = u?.value;
    if (key === 'ui.text_scale') {
      const v = val as TextScale;
      if (v !== 'compact' && v !== 'normal' && v !== 'large') {
        return NextResponse.json({ error: 'ui.text_scale must be compact|normal|large' }, { status: 400 });
      }
      rows.push({ key, value: v });
    } else {
      if (typeof val !== 'boolean') {
        return NextResponse.json({ error: `boolean required for ${key}` }, { status: 400 });
      }
      rows.push({ key, value: val });
    }
  }

  try {
    const admin = createServiceRoleClient();
    const now = new Date().toISOString();
    const { error } = await admin.from('site_settings').upsert(
      rows.map((r) => ({
        key: r.key,
        value: r.value as Json,
        updated_at: now,
      })),
      { onConflict: 'key' },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/design');
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
