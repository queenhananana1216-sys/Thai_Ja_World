/**
 * 미게시(published=false) 지식 초안을 LLM으로 전부 재가공 (로컬·CI에서 1회 실행)
 *
 *   npm run knowledge:reprocess-drafts
 *
 * 필요: .env.local — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *       GEMINI_API_KEY(또는 OPENAI 등), NEWS_SUMMARY_PROVIDER=gemini 권장
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import {
  isKnowledgeLlmConfigured,
  reprocessUnpublishedKnowledgeDraftsBatch,
} from '../src/bots/actions/processAndPersistKnowledge';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const BATCH = Math.min(
  10,
  Math.max(1, Math.floor(Number(process.env.KNOWLEDGE_REPROCESS_BATCH || '10'))),
);
const MAX_ROUNDS = Math.min(
  500,
  Math.max(1, Math.floor(Number(process.env.KNOWLEDGE_REPROCESS_MAX_ROUNDS || '200'))),
);

async function main() {
  console.log('[knowledge:reprocess-drafts] 시작… (미게시 초안만, 배치 크기', BATCH, ')');
  if (!isKnowledgeLlmConfigured()) {
    console.error(
      '[knowledge:reprocess-drafts] LLM 미설정 — GEMINI_API_KEY 또는 OPENAI_API_KEY 등을 .env.local 에 넣으세요.',
    );
    process.exit(1);
  }

  let round = 0;
  let totalOk = 0;
  let totalFail = 0;

  while (round < MAX_ROUNDS) {
    round += 1;
    const r = await reprocessUnpublishedKnowledgeDraftsBatch(BATCH);
    totalOk += r.succeeded;
    totalFail += r.failed;
    console.log(
      `[knowledge:reprocess-drafts] 라운드 ${round} attempted=${r.attempted} ok=${r.succeeded} fail=${r.failed} remaining=${r.remaining_unpublished}`,
    );
    if (r.details.some((d) => !d.ok)) {
      for (const d of r.details.filter((x) => !x.ok)) {
        console.warn(`  ✗ ${d.old_processed_id.slice(0, 8)}… ${d.error ?? ''}`);
      }
    }

    if (r.remaining_unpublished === 0) {
      console.log('[knowledge:reprocess-drafts] 완료 — 미게시 초안 0건');
      break;
    }
    if (r.attempted === 0) {
      console.log('[knowledge:reprocess-drafts] 처리할 행 없음 (remaining 표기만 남음)');
      break;
    }
    if (r.succeeded === 0 && r.failed > 0) {
      console.error('[knowledge:reprocess-drafts] 이번 배치 전부 실패 — 중단 (쿼터·키 확인)');
      process.exit(2);
    }
  }

  if (round >= MAX_ROUNDS) {
    console.warn(`[knowledge:reprocess-drafts] 최대 라운드 ${MAX_ROUNDS} 도달 — 다시 실행해 남은 건 처리하세요.`);
  }

  console.log('[knowledge:reprocess-drafts] 요약', { rounds: round, totalOk, totalFail });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
