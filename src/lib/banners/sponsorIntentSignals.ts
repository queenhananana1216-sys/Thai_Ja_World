import type { PublicBanner } from '@/lib/banners/types';

export const TJ_SPONSOR_SIGNALS_COOKIE = 'tj_sponsor_signals';

/** 배너·스폰서 슬롯 타겟용 — 클라 방문 패턴과 매칭 (쿠키 JSON 키). */
export type SponsorSignals = Record<string, number>;

export function parseSponsorSignalsCookie(raw: string | null | undefined): SponsorSignals {
  if (!raw?.trim()) return {};
  try {
    const decoded = raw.includes('%') ? decodeURIComponent(raw) : raw;
    const j = JSON.parse(decoded) as unknown;
    if (!j || typeof j !== 'object' || Array.isArray(j)) return {};
    const out: SponsorSignals = {};
    for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[String(k)] = Math.min(999, Math.max(0, Math.floor(n)));
    }
    return out;
  } catch {
    return {};
  }
}

/** pathname 기준으로 신호 소폭 증분 (복수 경로 학습 가능). 데모·스팸 방지 상한 적용. */
export function bumpSponsorSignalsForPath(current: SponsorSignals, pathname: string): SponsorSignals {
  const next: SponsorSignals = { ...current };
  const bump = (key: string, d: number) => {
    next[key] = Math.min(100, Math.max(0, (next[key] ?? 0) + d));
  };
  const p = pathname.toLowerCase();
  if (p.startsWith('/news')) bump('news', 5);
  if (p.startsWith('/shop') || p.startsWith('/korean-biz') || p.startsWith('/rental')) bump('real_estate', 4);
  /** 꿀팁 허브·글 상세 — 스폰서 intent `tips` 가중 */
  if (p.startsWith('/tips')) {
    const depth = p.split('/').filter(Boolean).length;
    bump('tips', depth >= 2 ? 7 : 4);
  }
  if (p.startsWith('/visa')) bump('visa', 2);
  if (p.startsWith('/community')) bump('community', 2);
  if (p.startsWith('/boards')) bump('boards', 3);
  if (p.startsWith('/local') || p.startsWith('/my-local-shop')) bump('local', 3);
  if (p.startsWith('/minihome')) bump('minihome', 2);
  return next;
}

/** 체류(dwell)가 길면 뉴스·꿀팁 관심도를 추가 반영 — 배너 랭킹용 */
export function bumpSponsorSignalsFromDwell(
  current: SponsorSignals,
  pathname: string,
  dwellMs: number,
): SponsorSignals {
  /** 경로 이탈 전 체류가 10초 이상일 때만 가산 — 스크롤·읽기 패턴 근사 */
  if (!Number.isFinite(dwellMs) || dwellMs < 10_000) return current;
  const next: SponsorSignals = { ...current };
  const bump = (key: string, d: number) => {
    next[key] = Math.min(100, Math.max(0, (next[key] ?? 0) + d));
  };
  const p = pathname.toLowerCase();
  if (p.startsWith('/news')) bump('news', 4);
  if (p.startsWith('/tips')) bump('tips', 4);
  return next;
}

/**
 * 의도 신호 매칰이 없을 때도 sort_order 우선 순서 유지.
 * 높은 점수 = 앞쪽 노출 후보.
 */
export function bannerIntentRankingScore(banner: PublicBanner, weights: SponsorSignals): number {
  const raw = banner.extra.target_intents ?? banner.extra.targetIntents;
  let intents: string[] = [];
  if (Array.isArray(raw)) {
    intents = raw.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()));
  } else if (typeof raw === 'string') {
    intents = raw
      .split(/[,|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  let intent = 0;
  for (const t of intents) intent += weights[t] ?? 0;
  const order = typeof banner.sortOrder === 'number' && Number.isFinite(banner.sortOrder) ? banner.sortOrder : 0;
  return intent * 10_000 + (1_000_000 - Math.min(order, 999_999));
}
