/**
 * 공개 API·클라이언트에 넘길 정수 %만 (합 100). 원시 득표 수는 노출하지 않음.
 */
export function votesToPublicIntPct(votesA: number, votesB: number): { pctA: number; pctB: number } {
  const a = Math.max(0, Math.floor(Number(votesA)) || 0);
  const b = Math.max(0, Math.floor(Number(votesB)) || 0);
  const t = a + b;
  if (t === 0) return { pctA: 50, pctB: 50 };
  const pctA = Math.round((a / t) * 100);
  return { pctA, pctB: 100 - pctA };
}
