/**
 * 최근 NEWS_BACKFILL_EDITOR_DAYS일(기본 7) processed_news 에 editor_note 백필.
 * 한 번에 최대 NEWS_BACKFILL_EDITOR_BATCH(기본 40)건; 남은 건은 스크립트를 여러 번 실행하거나
 * 아래 루프가 eligible 이 0이 될 때까지 반복합니다.
 *
 * 사용: npm run news:backfill-editor-notes
 *       프로젝트 루트, .env.local (SUPABASE_SERVICE_ROLE_KEY, LLM 키)
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { backfillProcessedNewsEditorNotes } from '../src/bots/actions/summarizeAndPersistNews';

config({ path: resolve(process.cwd(), '.env.local') });

const days = Math.min(
  30,
  Math.max(1, Math.floor(Number(process.env.NEWS_BACKFILL_EDITOR_DAYS) || 7)),
);
const batch = Math.min(
  60,
  Math.max(1, Math.floor(Number(process.env.NEWS_BACKFILL_EDITOR_BATCH) || 40)),
);
const maxRounds = Math.min(25, Math.max(1, Math.floor(Number(process.env.NEWS_BACKFILL_EDITOR_ROUNDS) || 15)));

async function main() {
  console.log(`[news:backfill-editor-notes] days=${days} batch=${batch} maxRounds=${maxRounds}`);
  let totalUpdated = 0;

  for (let round = 0; round < maxRounds; round++) {
    const r = await backfillProcessedNewsEditorNotes(days, batch);
    console.log(`[news:backfill-editor-notes] round ${round + 1}`, JSON.stringify(r, null, 2));

    if (!r.llmConfigured) {
      console.error('[news:backfill-editor-notes] LLM 미설정 — OPENAI/GEMINI/LOCAL_LLM 확인');
      process.exit(1);
    }

    totalUpdated += r.updated;
    if (r.errors.length > 0 && r.errors[0]?.id !== '-') {
      const sample = r.errors.slice(0, 5);
      console.warn('[news:backfill-editor-notes] 일부 오류(샘플):', sample);
    }

    if (r.eligible === 0) {
      console.log(`[news:backfill-editor-notes] 완료 — 총 갱신 ${totalUpdated}건`);
      return;
    }
    if (r.updated === 0) {
      console.warn(
        '[news:backfill-editor-notes] 진행 없음(eligible>0) — LLM/네트워크 오류 가능. 로그 확인 후 재실행하세요.',
      );
      process.exit(1);
    }
  }

  console.log(`[news:backfill-editor-notes] 라운드 상한 도달 — 총 갱신 ${totalUpdated}건 (남은 eligible 은 API/재실행으로 확인)`);
}

main().catch((e) => {
  console.error('[news:backfill-editor-notes] 실패:', e);
  process.exit(1);
});
