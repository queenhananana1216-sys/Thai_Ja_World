/**
 * src/lib/utils/formatDate.ts — 날짜 포맷 유틸리티 (서버·클라이언트 공용)
 */

/**
 * ISO 날짜 문자열을 한국어 상대/절대 표기로 변환.
 * - 1시간 미만: "방금 전"
 * - 24시간 미만: "N시간 전"
 * - 7일 미만: "N일 전"
 * - 그 외: "YYYY.MM.DD"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / 3_600_000;
  const diffDays = diffMs / 86_400_000;

  if (diffHours < 1) return '방금 전';
  if (diffHours < 24) return `${Math.floor(diffHours)}시간 전`;
  if (diffDays < 7) return `${Math.floor(diffDays)}일 전`;

  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** URL에서 hostname 만 추출 (출처 표시용) */
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
