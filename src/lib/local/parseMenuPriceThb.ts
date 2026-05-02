/** OCR·표시용 가격 문자열에서 THB 숫자 추출 (기호·쉼표 무시). */
export function parsePriceToThb(priceStr: string): number {
  const raw = String(priceStr ?? '').replace(/,/g, '').trim();
  const n = Number(raw.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function dateKeyBangkok(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}
