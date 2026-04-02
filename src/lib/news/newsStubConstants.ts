/** 스텁 요약에 포함 — 관리 UI에서 «LLM 미가공 초안» 판별 */
export const NEWS_STUB_SUMMARY_SNIPPET = '원문 본문이 비어 있거나 매우 짧습니다';

/** 발췌만 넣은 자동 초안 (LLM 전) — buildStubBilingualPayload */
export const NEWS_AUTO_DRAFT_EXCERPT_MARKER = '(자동 초안: 원문 발췌';

/** 편집 노트에 포함 — LLM 호출 없이 만든 초안 */
export const NEWS_STUB_EDITOR_NOTE_MARKER = 'LLM 없음·오류로';

/**
 * 승인 큐에서 «아직 LLM·편집 가공이 안 된 초안」으로 볼 수 있는 한국어 요약인지.
 * (원문 비었음 스텁 / 발췌+LLM 대기 문구 모두 포함)
 */
export function isNewsStubKoSummary(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (t.includes(NEWS_STUB_SUMMARY_SNIPPET)) return true;
  if (t.includes(NEWS_AUTO_DRAFT_EXCERPT_MARKER)) return true;
  return false;
}
