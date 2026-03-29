/** 한글 음절 → 초성만 이어 붙인 문자열 (검색용) */
const CHO = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

export function hangulChosungSequence(text: string): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp >= 0xac00 && cp <= 0xd7a3) {
      const idx = Math.floor((cp - 0xac00) / 588);
      out += CHO[idx] ?? '';
    }
  }
  return out;
}

const CHO_SET = new Set<string>(CHO as unknown as string[]);

/** 입력이 공백 제거 후 전부 한글 자음(초성 자판)이면 true */
export function isChosungOnlyQuery(q: string): boolean {
  const t = q.replace(/\s/g, '');
  if (!t) return false;
  for (const ch of t) {
    if (!CHO_SET.has(ch)) return false;
  }
  return true;
}
