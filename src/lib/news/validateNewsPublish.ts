import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';

const MIN_KO_TITLE = 2;
const MIN_KO_SUMMARY = 20;

/**
 * 홈·뉴스 상세에 그대로 나가는 한국어 제목·요약 최소 기준
 */
export function validateNewsPublishFields(ko_title: string, ko_summary: string): string | null {
  const title = ko_title.trim();
  const summary = ko_summary.trim();
  if (title.length < MIN_KO_TITLE) {
    return `한국어 제목을 ${MIN_KO_TITLE}자 이상 입력해 주세요.`;
  }
  if (summary.length < MIN_KO_SUMMARY) {
    return `한국어 요약을 ${MIN_KO_SUMMARY}자 이상으로 다듬은 뒤 게시해 주세요. 이용자 홈·뉴스에 그대로 노출됩니다.`;
  }
  return null;
}

export function validateProcessedNewsRowForPublish(
  cleanBody: string | null | undefined,
  rawTitle: string | null | undefined,
  summaries: { summary_text: string; model?: string | null }[] | null | undefined,
): string | null {
  const { title, summary_text } = titleAndSummaryFromProcessed(cleanBody, rawTitle, summaries, 'ko');
  return validateNewsPublishFields(title, summary_text ?? '');
}
