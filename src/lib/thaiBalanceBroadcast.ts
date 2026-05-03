/** 클라이언트 전역 — 글/댓글 등 보상 후 헤더·하단 지갑이 DB와 맞추도록 */
export const TJ_THAI_BALANCE_REFETCH = 'tj-thai-balance-refetch';

export function requestThaiBalanceRefetch(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(TJ_THAI_BALANCE_REFETCH));
}
