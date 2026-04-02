/**
 * POST /api/bot/knowledge-collect
 *
 * knowledge_sources (is_active=true) 순회 → raw_knowledge upsert
 *
 * Body (JSON, 모두 선택):
 * { "idempotencyKey": "daily-knowledge-2026-03-26", "itemsPerSource": 5 }
 *
 * 필요 환경 변수: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL
 * 선택 환경 변수: KNOWLEDGE_ITEMS_PER_SOURCE, KNOWLEDGE_MAX_RAW_BODY_LEN, KNOWLEDGE_FRESHNESS_DAYS
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  runKnowledgeCollectLoop,
  type RunKnowledgeCollectOptions,
} from '@/bots/orchestrator/runKnowledgeCollectLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';

const MAX_KEY_LENGTH = 128;
const MAX_ITEMS = 20;

function validateBody(raw: unknown): { options: RunKnowledgeCollectOptions; error?: never } | { options?: never; error: string } {
  if (raw !== null && typeof raw !== 'object') {
    return { error: 'Request body must be a JSON object.' };
  }
  const body = (raw ?? {}) as Record<string, unknown>;
  const out: RunKnowledgeCollectOptions = {};

  const key = body.idempotencyKey;
  if (key !== undefined) {
    if (typeof key !== 'string' || key.length === 0) return { error: 'idempotencyKey must be a non-empty string.' };
    if (key.length > MAX_KEY_LENGTH) return { error: `idempotencyKey must not exceed ${MAX_KEY_LENGTH} characters.` };
    out.idempotencyKey = key;
  }

  const ips = body.itemsPerSource;
  if (ips !== undefined) {
    if (typeof ips !== 'number' || !Number.isFinite(ips)) return { error: 'itemsPerSource must be a finite number.' };
    const n = Math.floor(ips);
    if (n < 1 || n > MAX_ITEMS) return { error: `itemsPerSource must be between 1 and ${MAX_ITEMS}.` };
    out.itemsPerSource = n;
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
    const result = await runKnowledgeCollectLoop(validation.options);
    if (result.skipped) return NextResponse.json({ status: 'skipped', run_id: result.run_id }, { status: 200 });
    if (!result.success) {
      return NextResponse.json({ status: 'error', run_id: result.run_id, error: result.error, output: result.output }, { status: 500 });
    }
    return NextResponse.json({ status: 'ok', run_id: result.run_id, output: result.output }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/knowledge-collect] Unhandled error:', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
