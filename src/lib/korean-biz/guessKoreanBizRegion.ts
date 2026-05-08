import type { KoreanBizRow } from '@/lib/korean-biz/koreanBizTypes';

/** 주소 문자열로 대략적인 지역 버킷 추정 (실패 시 방콕). */
export function guessKoreanBizRegionFromAddress(addr: string | null | undefined): KoreanBizRow['region'] {
  const a = String(addr ?? '').toLowerCase();
  if (/chiang\s*mai|เชียงใหม่|chiangmai/.test(a)) return 'chiangmai';
  if (/pattaya|พัทยา|jomtien|芭提雅/.test(a)) return 'pattaya';
  return 'bangkok';
}
