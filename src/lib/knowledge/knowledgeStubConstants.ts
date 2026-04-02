/** 스텁 요약에 포함 — 승인 API·관리 UI에서 «편집팀 안내 필수» 판별 */
export const KNOWLEDGE_STUB_SUMMARY_SNIPPET = '원문 본문이 비어 있거나 매우 짧습니다';

/** 발췌만 넣은 자동 초안 (LLM 전) — buildKnowledgeStubLlmOutput */
export const KNOWLEDGE_LLM_PENDING_MARKER = 'LLM 가공 전입니다';

export const KNOWLEDGE_AUTO_DRAFT_EXCERPT_MARKER = '(자동 초안: 원문 발췌';

/**
 * 승인 큐에서 «아직 LLM·편집 가공이 안 된 초안」으로 볼 수 있는 한국어 요약인지.
 * (원문 비었음 스텁 / 발췌+LLM 대기 문구 모두 포함)
 */
export function isKnowledgeStubKoSummary(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.includes(KNOWLEDGE_STUB_SUMMARY_SNIPPET)) return true;
  if (t.includes(KNOWLEDGE_LLM_PENDING_MARKER)) return true;
  if (t.includes(KNOWLEDGE_AUTO_DRAFT_EXCERPT_MARKER)) return true;
  return false;
}
