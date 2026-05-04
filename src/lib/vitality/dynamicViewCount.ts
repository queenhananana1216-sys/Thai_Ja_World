import { getPerceivedViewCount } from '@/lib/utils';

function hash32(input: string): number {
  const key = String(input ?? '').trim();
  let acc = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    acc ^= key.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  return acc >>> 0;
}

/** Asia/Bangkok 달력 기준 연·월·일·시 */
function bangkokParts(atMs: number): { y: number; mon: number; d: number; h: number; dow: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(new Date(atMs));
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const y = get('year');
  const mon = get('month');
  const d = get('day');
  const h = get('hour');
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[wd.slice(0, 3)] ?? 1;
  return { y, mon, d, h, dow };
}

/**
 * 실제 조회수 + 기존 체감 오프셋 + 시간대·일·주·월 스케일이 다른 가중치(패턴 난화).
 * 저조회(실제 ≈320 이하)에는 글 id·시간대 기반 가변 배수로 수백 회 이상 노출을 보장한다.
 */
export function getVitalityViewCount(realViews: number, postId: string, atMs = Date.now()): number {
  const postHash = hash32(postId);
  const r = Math.floor(Number(realViews));
  const real = Number.isFinite(r) ? Math.max(0, r) : 0;

  const perceived = getPerceivedViewCount(real, postId);
  /** 저조회: 최소 수백 단위 노출(가변 배수·난화) — 필고급 체감 화력 */
  const viralFloor =
    real <= 320
      ? Math.max(
          520,
          Math.round(real * (34 + (postHash % 18))) + (180 + (postHash % 500)),
        )
      : perceived;
  const base = real <= 320 ? Math.max(perceived, viralFloor) : perceived;

  const { mon, d, h: bh, dow } = bangkokParts(atMs);
  const dayWave = ((postHash * 17 + d * 31 + bh * 5) % 47) - 23;
  const weekWave = ((dow * 19 + mon * 7) % 73) - 36;
  const monthMicro = ((mon * 11 + (postHash % 97)) % 25) - 12;
  const blended = dayWave * 0.55 + weekWave * 0.35 + monthMicro * 0.1;

  const out = Math.round(base + blended);
  return Math.max(0, out);
}
