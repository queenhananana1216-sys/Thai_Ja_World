/**
 * POST /api/bot/knowledge-process
 *
 * processed_knowledge 없는 raw_knowledge 를 LLM으로 구조화 저장.
 * KNOWLEDGE_PUBLISH_MODE=manual 이면 published=false 초안 → /admin/knowledge 에서 게시.
 *
 * Body (JSON, 모두 선택):
 * { "limit": 5, "idempotencyKey": "optional-key" }
 *
 * 필요 환경 변수: Supabase service role + LLM (OPENAI_API_KEY / GEMINI_API_KEY / LOCAL_LLM_BASE_URL)
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  runKnowledgeProcessLoop,
  type RunKnowledgeProcessOptions,
} from '@/bots/orchestrator/runKnowledgeProcessLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';

const MAX_LIMIT = 30;

function validateBody(raw: unknown): { options: RunKnowledgeProcessOptions; error?: never } | { options?: never; error: string } {
  if (raw !== null && typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const out: RunKnowledgeProcessOptions = {};

  const key = body.idempotencyKey;
  if (key !== undefined) {
    if (typeof key !== 'string' || key.length === 0) return { error: 'idempotencyKey must be a non-empty string.' };
    if (key.length > 128) return { error: 'idempotencyKey must not exceed 128 characters.' };
    out.idempotencyKey = key;
  }

  const limit = body.limit;
  if (limit !== undefined) {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) return { error: 'limit must be a finite number.' };
    const n = Math.floor(limit);
    if (n < 1 || n > MAX_LIMIT) return { error: `limit must be between 1 and ${MAX_LIMIT}.` };
    out.limit = n;
  }

  return { options: out };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) rawBody = JSON.parse(text);
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON in request body.' }, { status: 400 });
  }

  const validation = validateBody(rawBody);
  if (validation.error) {
    return NextResponse.json({ status: 'error', error: validation.error }, { status: 400 });
  }

  try {
    const result = await runKnowledgeProcessLoop(validation.options);
    if (result.skipped) return NextResponse.json({ status: 'skipped', run_id: result.run_id }, { status: 200 });
    if (!result.success) {
      return NextResponse.json(
        { status: 'error', run_id: result.run_id, error: result.error, output: result.output },
        { status: result.error === 'LLM not configured' ? 503 : 500 },
      );
    }
    return NextResponse.json({ status: 'ok', run_id: result.run_id, output: result.output }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/knowledge-process] Unhandled error:', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
