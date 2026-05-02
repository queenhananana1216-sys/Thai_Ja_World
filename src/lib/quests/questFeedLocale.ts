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

type MissionTier = 'daily' | 'weekly' | 'monthly';

function inferMissionTier(text: string): MissionTier {
  const lower = text.toLowerCase();

  if (
    /\bweekly\b/i.test(text) ||
    /\bthis\s+week\b/i.test(lower) ||
    /\bper\s+week\b/i.test(lower) ||
    /주간\s*미션/u.test(text)
  ) {
    return 'weekly';
  }

  if (
    /\bmonthly\b/i.test(text) ||
    /\bthis\s+month\b/i.test(lower) ||
    /\bper\s+month\b/i.test(lower) ||
    /월간\s*미션/u.test(text)
  ) {
    return 'monthly';
  }

  const wl = lower.match(/\b(?:write|leave)\s+(\d+)\b/i);
  if (wl && Number(wl[1]) >= 8) {
    return 'monthly';
  }
  if (/\b8\b[^.]{0,52}(?:guestbook|messages?|comments?)/i.test(lower)) {
    return 'monthly';
  }

  if (
    /\btoday\b/i.test(lower) ||
    /\bdaily\b/i.test(lower) ||
    /\bper\s+day\b/i.test(lower) ||
    /\bleave\s+\d+\s+comments\s+today\b/i.test(lower) ||
    /오늘/u.test(text) ||
    /일일\s*미션/u.test(text)
  ) {
    return 'daily';
  }

  return 'daily';
}

function missionBracketForTier(tier: MissionTier, loc: 'ko' | 'th'): string {
  if (loc === 'th') {
    if (tier === 'weekly') return '[ภารกิจรายสัปดาห์]';
    if (tier === 'monthly') return '[ภารกิจรายเดือน]';
    return '[ภารกิจรายวัน]';
  }
  if (tier === 'weekly') return '[주간 미션]';
  if (tier === 'monthly') return '[월간 미션]';
  return '[일일 미션]';
}

/** `[Quest]` 등 접두를 기간 힌트에 맞는 미션 뱃지로 통일 */
function replaceQuestMissionPrefixes(text: string, loc: 'ko' | 'th'): string {
  const tier = inferMissionTier(text);
  const badge = missionBracketForTier(tier, loc);
  return text
    .replace(/\[\s*Quest\s*\]/gi, badge)
    .replace(/\[\s*Mission\s*\]/gi, badge)
    .replace(/\[\s*퀘스트\s*\]/gu, badge)
    .replace(/\[\s*미션\s*\]/gu, badge)
    .replace(/\[\s*เควสต์\s*\]/gu, badge);
}

/** 영문 보상 꼬리를 로케일 문장으로 */
function localizeRewardEnglish(text: string, loc: 'ko' | 'th'): string {
  let out = text;

  const dotoriKo = (n: string) => `🎁 ${n} 도토리 획득`;
  const dotoriTh = (n: string) => `🎁 ${n} ดอกท้อ รับแล้ว`;
  const cornKo = (n: string) => `🌽 ${n} 옥수수 획득`;
  const cornTh = (n: string) => `🌽 ${n} ข้าวโพด รับแล้ว`;

  const dotoriRepl = loc === 'th' ? dotoriTh : dotoriKo;
  const cornRepl = loc === 'th' ? cornTh : cornKo;

  out = out.replace(/\brewards?\s*[:\-–—]\s*(\d{1,7})\s*(?:dotori|acorns?)\b/gi, (_, n: string) =>
    dotoriRepl(n),
  );
  out = out.replace(/\brewards?\s+(\d{1,7})\s*(?:dotori|acorns?)\b/gi, (_, n: string) => dotoriRepl(n));
  out = out.replace(/\b(\d{1,7})\s*(?:dotori|acorns?)\s+rewards?\b/gi, (_, n: string) => dotoriRepl(n));
  out = out.replace(/\bgains?\s+(\d{1,7})\s*(?:dotori|acorns?)\b/gi, (_, n: string) => dotoriRepl(n));
  out = out.replace(/\bearns?\s+(\d{1,7})\s*(?:dotori|acorns?)\b/gi, (_, n: string) => dotoriRepl(n));

  out = out.replace(/\brewards?\s*[:\-–—]\s*(\d{1,7})\s*corn\b/gi, (_, n: string) => cornRepl(n));
  out = out.replace(/\brewards?\s+(\d{1,7})\s*corn\b/gi, (_, n: string) => cornRepl(n));
  out = out.replace(/\b(\d{1,7})\s*corn\s+rewards?\b/gi, (_, n: string) => cornRepl(n));

  return out;
}

/**
 * DB에서 오는 영문 미션·피드 원문을 현재 로케일 문구로 치환.
 * 긴 구문을 우선 적용하기 위해 `en` 길이 내림차순으로 치환합니다.
 */
export function localizeQuestFeedText(
  text: string,
  locale: Locale,
  feedPhraseMap: Dictionary['quests']['feedPhraseMap'],
): string {
  let out = stripQuestFeedWeatherClutter(text);
  const loc = locale === 'th' ? 'th' : 'ko';

  out = localizeRewardEnglish(out, loc);
  out = replaceQuestMissionPrefixes(out, loc);

  const sorted = [...feedPhraseMap].sort((a, b) => b.en.length - a.en.length);
  for (const row of sorted) {
    const pattern = row.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(pattern, 'gi');
    const replacement = loc === 'th' ? row.th : row.ko;
    out = out.replace(re, replacement);
  }
  return out;
}
