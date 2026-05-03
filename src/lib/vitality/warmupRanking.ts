export type ThaiEarnRankRowInput = {
  rank: number;
  profileId: string;
  displayName: string;
  thaiEarnedToday: number;
  isWarmup?: boolean;
};

function hash32(input: string): number {
  let acc = 2166136261 >>> 0;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    acc ^= s.charCodeAt(i);
    acc = Math.imul(acc, 16777619) >>> 0;
  }
  return acc >>> 0;
}

/**
 * 당일 랭킹 RPC가 비었을 때만 — 실제 프로필과 섞이지 않도록 별도 플래그로 표시 가능한 워밍업 행.
 */
export function buildWarmupTodayThaiRanking(limit: number, atMs = Date.now()): ThaiEarnRankRowInput[] {
  const safe = Math.max(1, Math.min(10, Math.floor(limit)));
  const bucket = Math.floor(atMs / 3_600_000);
  const namesKo = ['방콕러_민트', '파타야_서핑', 'CM_로컬', '한강비빔', 'Udon_탐험가', '비자Q_매니아'];
  const namesTh = ['กรุงเทพ_มิ้นท์', 'พัทยา_เซิร์ฟ', 'เชียงใหม่_โลคอล', 'อุดร_นักสำรวจ'];

  const out: ThaiEarnRankRowInput[] = [];
  for (let i = 0; i < safe; i++) {
    const seed = hash32(`warmup-${bucket}-${i}`);
    const thaiEarnedToday = 40 + (seed % 180);
    const isTh = (seed >> 8) % 5 === 0;
    const displayName = isTh ? namesTh[seed % namesTh.length]! : namesKo[seed % namesKo.length]!;
    out.push({
      rank: i + 1,
      profileId: `warmup-synth-${bucket}-${i}`,
      displayName,
      thaiEarnedToday,
      isWarmup: true,
    });
  }
  return out;
}

export function mergeWarmupTodayThaiRanking(
  rows: ThaiEarnRankRowInput[],
  limit: number,
  atMs = Date.now(),
): ThaiEarnRankRowInput[] {
  const cap = Math.max(1, Math.min(20, Math.floor(limit)));
  if (rows.length > 0) return rows.slice(0, cap);
  return buildWarmupTodayThaiRanking(cap, atMs);
}
