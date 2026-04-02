/**
 * LLM → processed_knowledge.clean_body JSON 스키마 (봇·관리자·미리보기 공통)
 */
export interface KnowledgeLlmOutput {
  board_target: 'tips_board' | 'board_board';
  editorial_meta: {
    novelty_score: number;
    usefulness_score: number;
    confidence_level: 'high' | 'medium' | 'low';
    reasons: string[];
  };
  ko: {
    title: string;
    summary: string;
    editorial_note?: string;
    checklist: string[];
    cautions: string[];
    tags: string[];
  };
  th: {
    title: string;
    summary: string;
    editorial_note?: string;
    checklist: string[];
    cautions: string[];
    tags: string[];
  };
  board_copy: {
    category_badge_text: string;
    category_description: string;
  };
  sources: Array<{ external_url: string; source_name: string; retrieved_at: string }>;
}
