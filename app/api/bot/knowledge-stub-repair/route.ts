/**
 * POST /api/bot/knowledge-stub-repair — 스텁 지식 초안 LLM 재가공 (CRON_SECRET 헤더)
 * Body: { "limit": 6 } (선택, 1–12)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { runKnowledgeStubRepairLoop } from '@/bots/orchestrator/runKnowledgeStubRepairLoop';
import { isCronAuthorized } from '@/lib/cronAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(req.headers.get('authorization'))) {
    return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
  }

  let limit: number | undefined;
  try {
    const text = await req.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { limit?: unknown };
      if (body.limit !== undefined) {
        if (typeof body.limit !== 'number' || !Number.isFinite(body.limit)) {
          return NextResponse.json({ status: 'error', error: 'limit must be a number' }, { status: 400 });
        }
        const n = Math.floor(body.limit);
        if (n < 1 || n > 12) {
          return NextResponse.json({ status: 'error', error: 'limit must be 1–12' }, { status: 400 });
        }
        limit = n;
      }
    }
  } catch {
    return NextResponse.json({ status: 'error', error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const result = await runKnowledgeStubRepairLoop({ limit });
    if (!result.success) {
      const status = result.error?.includes('LLM not configured') ? 503 : 500;
      return NextResponse.json({ status: 'error', ...result }, { status });
    }
    return NextResponse.json({ status: 'ok', ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[API /api/bot/knowledge-stub-repair]', message);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
