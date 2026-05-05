import { NextResponse } from 'next/server';
import { normalizeFortuneRpcPayload } from '@/lib/fortune/fortuneRpcPayload';
import { recordPipelineErrorEvent } from '@/lib/pipeline/pipelineErrorLearning';
import { createServerSupabaseAuthClient } from '@/lib/supabase/serverAuthCookies';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const RPC_ATTEMPTS = 3;
const RPC_BUDGET_MS = 5200;

async function claimFortuneWithRetries(
  sb: SupabaseClient,
  locale: string,
): Promise<{ data: unknown; error: { message: string; code?: string } | null }> {
  let last: { message: string; code?: string } | null = null;

  for (let i = 0; i < RPC_ATTEMPTS; i++) {
    const raced = await Promise.race([
      sb.rpc('claim_daily_thailand_fortune', { p_locale: locale }).then((r) => ({
        tag: 'rpc' as const,
        data: r.data as unknown,
        error: r.error,
      })),
      new Promise<{ tag: 'timeout' }>((resolve) => {
        setTimeout(() => resolve({ tag: 'timeout' }), RPC_BUDGET_MS);
      }),
    ]);

    if (raced.tag === 'timeout') {
      last = { message: 'FORTUNE_RPC_TIMEOUT', code: 'TIMEOUT' };
      void recordPipelineErrorEvent({
        scope: 'fortune.daily',
        reasonCode: 'RPC_TIMEOUT_PHASE',
        messageExcerpt: `attempt_${i + 1}`,
      });
      await sleep(260 * (i + 1));
      continue;
    }

    const { data, error } = raced;
    if (!error) {
      return { data, error: null };
    }
    last = { message: error.message, code: error.code };
    const msg = String(error.message ?? '');
    if (!/PGRST302|timeout|closed|fetch|AbortError|ETIMEDOUT|ECONNRESET/i.test(msg)) {
      return { data, error };
    }
    await sleep(260 * (i + 1));
  }

  if (last?.message === 'FORTUNE_RPC_TIMEOUT') {
    void recordPipelineErrorEvent({
      scope: 'fortune.daily',
      reasonCode: 'RPC_TIMEOUT',
      messageExcerpt: 'exhausted_retries',
    });
    return { data: null, error: last };
  }
  return { data: null, error: last };
}

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

  const { data, error } = await claimFortuneWithRetries(sb, locale);

  if (error) {
    const msg = String(error.message ?? '');
    if (msg === 'FORTUNE_RPC_TIMEOUT') {
      return NextResponse.json(
        { ok: false, reason: 'TIMEOUT', message: msg },
        { status: 504 },
      );
    }
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
