import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/types';

/** `(방콕 34°C · 구름 조금)` 등 날씨·부가 꼬리 제거 — 제목·부제 공통 */
export function stripQuestFeedWeatherClutter(text: string): string {
  let t = text.trim();
  t = t.replace(/\s*\([^)]*(?:방콕|กรุงเทพ|Bangkok|Bangkok Metropolitan|กทม\.?)[^)]*\)/giu, ' ');
  t = t.replace(/\s*\([^)]*\d+\s*°?\s*[Cc℃°][^)]*\)/gu, ' ');
  t = t.replace(/\s*\([^)]*(?:구름|เมฆ|cloud|Cloud)[^)]*\)/giu, ' ');
  t = t.replace(/\s*\([^)]*(?:맑음|흐림|พายุ|ฝน)[^)]*\)/giu, ' ');
  t = t.replace(/\s{2,}/g, ' ').trim();
  return t;
}

/**
 * DB에서 오는 영문 퀘스트/피드 원문을 현재 로케일 문구로 치환.
 * 긴 구문을 우선 적용하기 위해 `en` 길이 내림차순으로 치환합니다.
 */
export function localizeQuestFeedText(
  text: string,
  locale: Locale,
  feedPhraseMap: Dictionary['quests']['feedPhraseMap'],
): string {
  let out = stripQuestFeedWeatherClutter(text);
  const loc = locale === 'th' ? 'th' : 'ko';
  const sorted = [...feedPhraseMap].sort((a, b) => b.en.length - a.en.length);
  for (const row of sorted) {
    const pattern = row.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(pattern, 'gi');
    const replacement = loc === 'th' ? row.th : row.ko;
    out = out.replace(re, replacement);
  }
  return out;
}
