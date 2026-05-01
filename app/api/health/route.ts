/**
 * GET /api/health — 도메인·DB 방어 체크. DB 불가 시 health.safe_mode 자동 세팅.
 */
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSiteBaseUrl } from '@/lib/seo/site';
import { createClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;
  try {
    const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await sb.from('site_settings').select('key').limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function checkOrigin(): Promise<{ ok: boolean; status: number | null; ms: number }> {
  const base = getSiteBaseUrl();
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(base, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'TaejaHealthCheck/1' },
    });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, ms: Date.now() - start };
  } catch {
    return { ok: false, status: null, ms: Date.now() - start };
  }
}

async function readSafeMode(): Promise<boolean> {
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin.from('site_settings').select('value').eq('key', 'health.safe_mode').maybeSingle();
    const v = (data as { value?: unknown } | null)?.value;
    return v === true;
  } catch {
    return false;
  }
}

export async function GET(): Promise<NextResponse> {
  const [dbOk, origin, safeModeBefore] = await Promise.all([checkDatabase(), checkOrigin(), readSafeMode()]);

  let safeMode = safeModeBefore;
  if (!dbOk) {
    try {
      const admin = createServiceRoleClient();
      await admin.from('site_settings').upsert(
        {
          key: 'health.safe_mode',
          value: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' },
      );
      safeMode = true;
      revalidatePath('/');
    } catch {
      /* 테이블 없음 등 */
    }
  }

  const degraded = !dbOk || !origin.ok;

  return NextResponse.json({
    status: degraded ? 'degraded' : 'ok',
    safe_mode: safeMode,
    checks: {
      database: dbOk,
      origin: { ok: origin.ok, http_status: origin.status, latency_ms: origin.ms },
    },
    hint: !dbOk
      ? 'Supabase에 연결할 수 없습니다. health.safe_mode 가 켜졌을 수 있습니다.'
      : undefined,
  });
}
