import type { KnowledgeLlmOutput } from '@/lib/knowledge/knowledgeLlmTypes';

/** 관리자 카드 폼 상태 → 이용자 게시 본문과 동일하게 미리보기할 때 */
export function knowledgeLlmFromQueueFields(
  item: {
    board_target: 'tips_board' | 'board_board';
    confidence_level: 'high' | 'medium' | 'low';
    novelty_score: number;
    usefulness_score: number;
    ko_checklist: string[];
    ko_cautions: string[];
    ko_tags: string[];
  },
  f: {
    ko_title: string;
    ko_summary: string;
    ko_editorial_note: string;
    th_title: string;
    th_summary: string;
    th_editorial_note: string;
  },
): KnowledgeLlmOutput {
  return {
    board_target: item.board_target,
    editorial_meta: {
      novelty_score: item.novelty_score,
      usefulness_score: item.usefulness_score,
      confidence_level: item.confidence_level,
      reasons: [],
    },
    ko: {
      title: f.ko_title.trim(),
      summary: f.ko_summary.trim(),
      editorial_note: f.ko_editorial_note.trim() || undefined,
      checklist: item.ko_checklist,
      cautions: item.ko_cautions,
      tags: item.ko_tags,
    },
    th: {
      title: f.th_title.trim(),
      summary: f.th_summary.trim(),
      editorial_note: f.th_editorial_note.trim() || undefined,
      checklist: [],
      cautions: [],
      tags: [],
    },
    board_copy: { category_badge_text: '', category_description: '' },
    sources: [],
  };
}
