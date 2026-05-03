/**
 * POST /api/internal/sandbox-proposals
 * 도커 워치독 등이 Bearer 시크릿으로 파이프라인 제안을 적재합니다.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ingestSecret(): string | null {
  return (
    process.env.WATCHDOG_SANDBOX_INGEST_SECRET?.trim() ||
    process.env.SANDBOX_PROPOSAL_INGEST_SECRET?.trim() ||
    null
  );
}

type Body = {
  title?: string;
  description?: string;
  code_text?: string;
  language?: string;
  pipeline_kind?: string;
  source?: string;
  trigger_context?: Record<string, unknown>;
  external_ref?: string;
};

export async function POST(request: Request) {
  const secret = ingestSecret();
  if (!secret) {
    return NextResponse.json({ error: 'ingest_secret_not_configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const codeText = typeof body.code_text === 'string' ? body.code_text : '';
  if (!title || !codeText.trim()) {
    return NextResponse.json({ error: 'title_and_code_text_required' }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const row = {
    title,
    description: typeof body.description === 'string' ? body.description.trim() || null : null,
    code_text: codeText.trim(),
    language: typeof body.language === 'string' && body.language.trim() ? body.language.trim() : 'typescript',
    pipeline_kind: typeof body.pipeline_kind === 'string' ? body.pipeline_kind.trim() || null : null,
    source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'watchdog',
    trigger_context:
      body.trigger_context && typeof body.trigger_context === 'object' && !Array.isArray(body.trigger_context)
        ? body.trigger_context
        : {},
    external_ref: typeof body.external_ref === 'string' && body.external_ref.trim() ? body.external_ref.trim() : null,
    status: 'pending' as const,
  };

  const { data, error } = await admin.from('sandbox_script_proposals').insert(row).select('id').single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, deduped: true, reason: 'external_ref_exists' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
