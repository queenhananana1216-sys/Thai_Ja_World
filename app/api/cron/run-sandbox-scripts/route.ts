/**
 * GET /api/cron/run-sandbox-scripts — active_scripts 중 cron 훅 실행
 */
import { type NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { isCronAuthorized } from '@/lib/cronAuth';
import { runInjectedScript } from '@/lib/sandbox/runInjectedScript';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const RUN_TIMEOUT_MS = Math.min(
  60_000,
  Math.max(3000, Number(process.env.SANDBOX_SCRIPT_TIMEOUT_MS?.trim() || '12000')),
);

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: rows, error } = await admin
    .from('active_scripts')
    .select('id, slug, code_text, hook_target, enabled')
    .eq('enabled', true)
    .eq('hook_target', 'cron');

  if (error) {
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  const scripts = rows ?? [];
  const results: { slug: string; ok: boolean; error?: string }[] = [];
  const now = new Date().toISOString();

  const ctx = {
    log: (...args: unknown[]) => {
      console.log('[sandbox-cron]', ...args);
    },
    nowIso: () => now,
  };

  for (const s of scripts) {
    const slug = typeof s.slug === 'string' ? s.slug : '';
    const code = typeof s.code_text === 'string' ? s.code_text : '';
    const id = typeof s.id === 'string' ? s.id : '';
    if (!slug || !code.trim()) {
      results.push({ slug: slug || id, ok: false, error: 'empty' });
      continue;
    }

    const out = await runInjectedScript(code, ctx, RUN_TIMEOUT_MS);
    const ok = out.ok;
    results.push({ slug, ok, ...(!ok && out.ok === false ? { error: out.error } : {}) });

    await admin
      .from('active_scripts')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_ok: ok,
        last_run_error: ok ? null : out.ok === false ? out.error : 'unknown',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
  }

  return NextResponse.json({
    status: 'ok',
    ran: results.length,
    results,
  });
}
