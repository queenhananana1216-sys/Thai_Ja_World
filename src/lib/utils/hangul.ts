/**
 * 한글 음절 → 초성(19자) 추출 · 초성 자모 입력 정규화
 * 음절 범위: U+AC00–U+D7A3
 */

/** 호환 자모 기준 초성 19자 (ㄱ … ㅎ, 쌍자음 포함) */
const CHOSEONG_JAMO = [
  '\u3131',
  '\u3132',
  '\u3134',
  '\u3137',
  '\u3138',
  '\u3139',
  '\u3141',
  '\u3142',
  '\u3143',
  '\u3145',
  '\u3146',
  '\u3147',
  '\u3148',
  '\u3149',
  '\u314a',
  '\u314b',
  '\u314c',
  '\u314d',
  '\u314e',
] as const;

const CHO_JAMO_SET = new Set<string>(CHOSEONG_JAMO);

/**
 * 입력 문자열에서 한글 음절의 초성만 이어붙여 반환합니다.
 * 이미 초성/쌍자음 호환 자모(ㄱ–ㅎ)로만 이루어진 글자는 그대로 이어 붙입니다.
 * 공백·영문·숫자는 초성열에서 제외합니다(전체 문구 매칭은 별도 substring으로 처리).
 */
export function getChosung(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0xac00 && cp <= 0xd7a3) {
      const idx = Math.floor((cp - 0xac00) / 588);
      if (idx >= 0 && idx < CHOSEONG_JAMO.length) {
        out += CHOSEONG_JAMO[idx];
      }
    } else if (CHO_JAMO_SET.has(ch)) {
      out += ch;
    }
  }
  return out;
}

/** 검색용: 공백 제거한 초성열 */
export function getChosungCompact(text: string): string {
  return getChosung(text).replace(/\s+/g, '');
}

/**
 * 여러 필드를 합친 문자열이 검색어와 맞는지 (원문 부분일치 + 초성 부분일치)
 */
export function matchesHangulOrChosung(textParts: string[], query: string): boolean {
  const q = query.trim();
  if (!q) return false;

  const blob = textParts
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
    .join(' ')
    .toLowerCase();
  const ql = q.toLowerCase();
  if (blob.includes(ql)) return true;

  const chHay = getChosungCompact(textParts.join(' '));
  const chNeedle = getChosungCompact(q);
  if (chNeedle.length > 0 && chHay.includes(chNeedle)) return true;

  return false;
}
