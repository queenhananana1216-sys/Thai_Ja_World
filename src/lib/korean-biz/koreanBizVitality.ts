import { getVitalityViewCount } from '@/lib/vitality/dynamicViewCount';

const WHISPERS_KO = [
  '여기 사장님 친절해요!',
  '라인으로 문의하니 바로 답 왔어요',
  '왓츠로 예약했는데 깔끔했어요',
  '한인 생활망에서 본 곳인데 분위기 굿',
  '오늘 방콕 날씨랑 찰떡인 실내 코스예요',
] as const;

const WHISPERS_TH = [
  'เจ้าของร้านน่ารักมาก!',
  'ตอบ LINE ไวมาก',
  'จองผ่าน WhatsApp สะดวกดี',
  'บรรยากาศดีมาก',
] as const;

function hash32(input: string): number {
  let acc = 2166136261 >>> 0;
  const key = String(input ?? '');
  for (let i = 0; i < key.length; i++) {
    acc ^= key.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  return acc >>> 0;
}

/** 카드용 가변 조회수(실 DB 필드 없음 — 글 vitality와 동일 엔진) */
export function getKoreanBizDisplayViews(bizId: string): number {
  return getVitalityViewCount(0, `korean-biz:${bizId}`);
}

export function koreanBizCommunityWhisper(bizId: string, locale: 'ko' | 'th'): string {
  const h = hash32(bizId);
  const pool = locale === 'th' ? WHISPERS_TH : WHISPERS_KO;
  return pool[h % pool.length]!;
}
