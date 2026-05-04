import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { GHOST_VITALITY_PERSONA_IDS } from '@/lib/cron/ghostVitalityPersonas';

const COMMENTS_KO = [
  '오 여기 꿀팁이네요!',
  '방콕 날씨 대박..',
  '저도 비슷한 경험 있어요 — 공유 감사합니다',
  '이번 주에 한번 가봐야겠어요',
  '체크리스트만 봐도 도움 됐어요',
] as const;

const COMMENTS_TH = [
  'เคล็ดลับดีมาก!',
  'อากาศกรุงเทพฯ ร้อนแรงจริง ๆ',
  'ขอบคุณที่แชร์ครับ',
  'จดไว้แล้ว ไปลองดู',
] as const;

function pick<T>(arr: readonly T[], seed: number, i: number): T {
  const idx = (seed + i * 2654435761) >>> 0;
  return arr[idx % arr.length]!;
}

/**
 * 고스트라이터가 새 `board_posts` 행을 넣은 직후 — 서로 다른 페르소나로 공감·짧은 댓글을 시드한다.
 * 서비스 롤로 삽입(RLS 우회). 실패해도 본문 게시는 성공으로 둔다.
 */
export async function seedGhostBoardPostVitality(
  admin: SupabaseClient,
  boardPostId: string,
  opts?: { localeHint?: 'ko' | 'th' },
): Promise<void> {
  const loc = opts?.localeHint === 'th' ? 'th' : 'ko';
  const seed = boardPostId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) >>> 0;

  const personas = [...GHOST_VITALITY_PERSONA_IDS];
  const nReactions = Math.min(2, personas.length);
  for (let i = 0; i < nReactions; i++) {
    const userId = personas[i]!;
    const { error } = await admin.from('board_post_reactions').insert({
      board_post_id: boardPostId,
      user_id: userId,
      kind: 'like',
    });
    if (error && !/duplicate key|unique constraint/i.test(error.message)) {
      console.warn('[seedGhostBoardPostVitality] reaction', error.message);
    }
  }

  const authorId = personas[seed % personas.length]!;
  const content = loc === 'th' ? pick(COMMENTS_TH, seed, 0) : pick(COMMENTS_KO, seed, 0);
  const { error: cErr } = await admin.from('board_post_comments').insert({
    board_post_id: boardPostId,
    author_id: authorId,
    content,
  });
  if (cErr) {
    console.warn('[seedGhostBoardPostVitality] comment', cErr.message);
  }
}
