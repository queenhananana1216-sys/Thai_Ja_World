import { NextResponse } from 'next/server';
import { normalizeFortuneRpcPayload } from '@/lib/fortune/fortuneRpcPayload';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 배포·헬스 프로브 — 인증 없이 JSON 형상만 확인 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    fortune_probe: true,
    ts: new Date().toISOString(),
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const sb = await createServerSupabaseAuthClient();
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ ok: false, reason: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  let locale = 'ko';
  try {
    const body = (await req.json()) as { locale?: string };
    if (body?.locale === 'th') locale = 'th';
  } catch {
    /* body 없음 → ko */
  }

  const runRpc = async () => sb.rpc('claim_daily_thailand_fortune', { p_locale: locale });

  let { data, error } = await runRpc();
  if (error && /PGRST302|timeout|closed|fetch/i.test(String(error.message ?? ''))) {
    ({ data, error } = await runRpc());
  }

  if (error) {
    const msg = String(error.message ?? '');
    console.warn('[fortune.pipeline]', 'RPC_ERROR', msg);
    void recordPipelineErrorEvent({
      scope: 'fortune.daily',
      reasonCode: 'RPC_ERROR',
      messageExcerpt: msg,
      meta: { code: String((error as { code?: string }).code ?? '') },
    });
    return NextResponse.json(
      { ok: false, reason: 'RPC_ERROR', message: msg },
      { status: 500 },
    );
  }

  let payload: unknown = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'json_parse';
      void recordPipelineErrorEvent({
        scope: 'fortune.daily',
        reasonCode: 'RPC_JSON_STRING_PARSE',
        messageExcerpt: msg,
      });
      return NextResponse.json({ ok: false, reason: 'PARSE_ERROR', message: msg }, { status: 500 });
    }
  }

  const normalized = normalizeFortuneRpcPayload(payload);
  if (!normalized) {
    void recordPipelineErrorEvent({
      scope: 'fortune.daily',
      reasonCode: 'EMPTY_OR_SHAPE',
      messageExcerpt: typeof payload === 'object' ? JSON.stringify(payload).slice(0, 400) : String(payload),
    });
    return NextResponse.json({ ok: false, reason: 'EMPTY_RESPONSE' }, { status: 500 });
  }

  if (normalized.ok === false) {
    const r = String(normalized.reason ?? '');
    if (r && !['ALREADY_CLAIMED', 'NOT_AUTHENTICATED'].includes(r)) {
      void recordPipelineErrorEvent({
        scope: 'fortune.daily',
        reasonCode: r,
        messageExcerpt: normalized.message ?? null,
      });
    }
  }

  return NextResponse.json(payload as Record<string, unknown>);
}
