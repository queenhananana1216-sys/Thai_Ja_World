/**
 * 승인 대기 중인 꿀팁(processed_knowledge, tips_board)·뉴스(processed_news)를
 * 관리자 API와 동일한 로직으로 배치 게시합니다(LLM 자동 컨셉 보정 포함).
 *
 * 사용 (프로젝트 루트, PowerShell):
 *   .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   그리고 게시글 작성자 UUID:
 *   $env:BULK_PUBLISH_AUTHOR_ID = "<auth.users.id 와 일치하는 profiles.id>"
 *   npx tsx scripts/zero-raw-bulk-publish-once.ts
 *
 * 반복 상한: ZERO_RAW_MAX_ROUNDS (기본 60). 뉴스 배치 크기: ZERO_RAW_NEWS_LIMIT (기본 60).
 * 캐시 무효화는 Next 런타임 밖에서는 생략됩니다 — 배포·첫 요청으로 페이지가 갱신됩니다.
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { adminReprocessProcessedNewsKoreanOnly, isNewsSummaryLlmConfigured } from '../src/bots/actions/summarizeAndPersistNews';
import { executeKnowledgePublishWithAutoConcept } from '../src/lib/knowledge/knowledgeAutoConceptPublish';
import type { ProcessedKnowledgeRow } from '../src/lib/knowledge/knowledgeQueuePublishCore';
import { validateProcessedNewsRowForPublish } from '../src/lib/news/validateNewsPublish';
import { createServiceRoleClient } from '../src/lib/supabase/admin';

config({ path: resolve(process.cwd(), '.env.local') });

const authorId = (process.env.BULK_PUBLISH_AUTHOR_ID || '').trim();
const maxRounds = Math.min(200, Math.max(1, parseInt(process.env.ZERO_RAW_MAX_ROUNDS || '60', 10) || 60));
const newsLimit = Math.min(120, Math.max(1, parseInt(process.env.ZERO_RAW_NEWS_LIMIT || '60', 10) || 60));

async function collectTipsDraftIds(admin: ReturnType<typeof createServiceRoleClient>): Promise<string[]> {
  const idList: string[] = [];
  const { data: rows, error } = await admin
    .from('processed_knowledge')
    .select('id, clean_body, board_target')
    .eq('published', false)
    .limit(120);
  if (error) throw new Error(error.message);
  for (const r of rows ?? []) {
    const bt = String(r.board_target ?? '');
    const llmBt = (() => {
      try {
        const c = r.clean_body;
        const o = typeof c === 'string' ? JSON.parse(c) : c;
        return typeof o?.board_target === 'string' ? o.board_target : '';
      } catch {
        return '';
      }
    })();
    const effective = llmBt || bt;
    if (effective !== 'tips_board') continue;
    idList.push(String(r.id));
  }
  return idList.slice(0, 80);
}

async function knowledgeRound(admin: ReturnType<typeof createServiceRoleClient>): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const ids = await collectTipsDraftIds(admin);
  if (ids.length === 0) return { attempted: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  for (const id of ids) {
    const { data: row, error: fetchErr } = await admin
      .from('processed_knowledge')
      .select('id, clean_body, published, raw_knowledge_id, post_id, board_target, raw_knowledge(external_url)')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !row) {
      failed += 1;
      continue;
    }
    const pr = row as unknown as ProcessedKnowledgeRow;
    if (pr.published) continue;

    const result = await executeKnowledgePublishWithAutoConcept(admin, {
      row: pr,
      authorId,
      fieldPatch: {},
      skipRevalidate: true,
    });
    if (result.ok) succeeded += 1;
    else failed += 1;
  }
  return { attempted: ids.length, succeeded, failed };
}

async function newsRound(admin: ReturnType<typeof createServiceRoleClient>): Promise<{
  updated: number;
  skipped: number;
  auto_enriched: number;
}> {
  const { data: rows, error } = await admin
    .from('processed_news')
    .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
    .eq('published', false)
    .order('created_at', { ascending: false })
    .limit(newsLimit);
  if (error) throw new Error(error.message);

  const toPublish: string[] = [];
  let skipped = 0;
  let auto_enriched = 0;

  for (const r of rows ?? []) {
    const id = String(r.id);
    const rn = r.raw_news as unknown as { title: string } | null;
    const sums = r.summaries as unknown as { summary_text: string; model: string | null }[] | null;
    let err = validateProcessedNewsRowForPublish(r.clean_body as string | null, rn?.title ?? null, sums ?? null);

    if (err && isNewsSummaryLlmConfigured()) {
      const rr = await adminReprocessProcessedNewsKoreanOnly(id);
      if (rr.ok) {
        const { data: r2, error: e2 } = await admin
          .from('processed_news')
          .select('id, clean_body, raw_news(title), summaries(summary_text, model)')
          .eq('id', id)
          .maybeSingle();
        if (!e2 && r2) {
          const rn2 = r2.raw_news as unknown as { title: string } | null;
          const sums2 = r2.summaries as unknown as { summary_text: string; model: string | null }[] | null;
          err = validateProcessedNewsRowForPublish(r2.clean_body as string | null, rn2?.title ?? null, sums2 ?? null);
          if (!err) auto_enriched += 1;
        }
      }
    }

    if (err) {
      skipped += 1;
      continue;
    }
    toPublish.push(id);
  }

  if (toPublish.length === 0) {
    return { updated: 0, skipped, auto_enriched };
  }

  const { error: upErr } = await admin.from('processed_news').update({ published: true }).in('id', toPublish);
  if (upErr) throw new Error(upErr.message);
  return { updated: toPublish.length, skipped, auto_enriched };
}

async function main() {
  if (!authorId) {
    console.error('[zero-raw] BULK_PUBLISH_AUTHOR_ID 가 필요합니다 (운영자 계정 UUID).');
    process.exit(1);
  }

  const admin = createServiceRoleClient();
  let kSum = { succeeded: 0, failed: 0, rounds: 0 };
  let nSum = { updated: 0, newsRounds: 0, lastSkipped: 0, auto_enriched: 0 };

  for (let i = 0; i < maxRounds; i++) {
    const kr = await knowledgeRound(admin);
    kSum.rounds += 1;
    kSum.succeeded += kr.succeeded;
    kSum.failed += kr.failed;
    if (kr.attempted === 0) break;
    console.log(`[zero-raw] knowledge round ${i + 1}: attempted=${kr.attempted} ok=${kr.succeeded} fail=${kr.failed}`);
  }

  for (let i = 0; i < maxRounds; i++) {
    const nr = await newsRound(admin);
    nSum.newsRounds += 1;
    nSum.updated += nr.updated;
    nSum.lastSkipped = nr.skipped;
    nSum.auto_enriched += nr.auto_enriched;
    console.log(`[zero-raw] news round ${i + 1}: published=${nr.updated} skipped=${nr.skipped} auto_enriched=${nr.auto_enriched}`);
    if (nr.updated === 0) break;
  }

  console.log(
    `[zero-raw] 완료 — 꿀팁: 성공 ${kSum.succeeded} · 실패 ${kSum.failed} (라운드 ${kSum.rounds}); 뉴스: 게시 ${nSum.updated} · LLM보정 ${nSum.auto_enriched} (라운드 ${nSum.newsRounds}); 마지막 뉴스 스킵 ${nSum.lastSkipped}`,
  );

  if (!isNewsSummaryLlmConfigured()) {
    console.warn('[zero-raw] 뉴스 LLM 미설정 — 미가공 뉴스는 스킵되었을 수 있습니다.');
  }
}

main().catch((e) => {
  console.error('[zero-raw] 실패:', e);
  process.exit(1);
});
