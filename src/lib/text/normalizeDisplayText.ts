const SPACE_RX = /[\u0000-\u001f\u007f-\u009f]+/g;
const MULTI_SPACE_RX = /\s+/g;
const AI_PHRASE_KO_RX =
  /\b(결론적으로|요약하면|이 글에서는|놀랍게도|한편으로는|즉,|정리하자면|종합하면|다시 말해|핵심은)\b[:\s,]*/gi;
const AI_PHRASE_TH_RX =
  /\b(กล่าวโดยสรุป|โดยสรุป|บทความนี้|น่าแปลกที่|กล่าวอีกนัยหนึ่ง|สรุปได้ว่า|โดยภาพรวม)\b[:\s,]*/gi;

function baseNormalize(input: string): string {
  return input.replace(SPACE_RX, ' ').replace(MULTI_SPACE_RX, ' ').trim();
}

function clamp(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(1, max - 1)).trim()}…`;
}

export function normalizeBannerText(input: string | null | undefined, max = 60): string {
  if (!input) return '';
  const normalized = baseNormalize(input).replace(/[|｜]/g, ' · ').replace(/\s{2,}/g, ' ');
  return clamp(normalized, max);
}

export function normalizeContainerText(input: string | null | undefined, max = 40): string {
  if (!input) return '';
  const normalized = baseNormalize(input)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[|｜]/g, ' · ')
    .replace(/\s{2,}/g, ' ');
  return clamp(normalized, max);
}

export function sanitizeAiKoreanPhrases(input: string | null | undefined): string {
  if (!input) return '';
  return baseNormalize(input).replace(AI_PHRASE_KO_RX, '').replace(/\s{2,}/g, ' ').trim();
}

export function sanitizeAiThaiPhrases(input: string | null | undefined): string {
  if (!input) return '';
  return baseNormalize(input).replace(AI_PHRASE_TH_RX, '').replace(/\s{2,}/g, ' ').trim();
}

export function sanitizeKoreanCommunityText(input: string | null | undefined, max = 420): string {
  if (!input) return '';
  let out = baseNormalize(input)
    .replace(/^(요약|한국어 요약|korean summary)\s*[:：-]\s*/i, '')
    .replace(/\b(독자 여러분|사용자 여러분)\b/g, '교민 여러분')
    .replace(/\b플랫폼\b/g, '커뮤니티')
    .replace(/\b태국-한국\b/g, '태국·한국')
    .replace(/\s*-\s*/g, ' ')
    .trim();

  // 같은 문장이 반복될 때 1회만 남겨 기계 번역 냄새를 줄임
  const deduped: string[] = [];
  for (const sentence of out.split(/(?<=[.!?。！？])\s+/)) {
    const s = sentence.trim();
    if (!s) continue;
    if (deduped[deduped.length - 1] === s) continue;
    deduped.push(s);
  }
  out = deduped.join(' ');

  return clamp(out, max);
}
