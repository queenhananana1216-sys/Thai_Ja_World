export const THAI_TOPUP_IDS = ['spark', 'monsoon', 'royal_elephant'] as const;
export type ThaiTopupId = (typeof THAI_TOPUP_IDS)[number];

export type ThaiTopupPack = {
  id: ThaiTopupId;
  label: string;
  /** Gemini-friendly: approximate THB charged (Stripe unit_amount÷100 when currency is thb) */
  amountThb: number;
  /** profiles.thai_balance increment */
  thaiCredits: number;
  tagline: string;
};

/** Stripe Checkout (mode=payment, currency THB) — 카드 즉결 → 웹훅에서 thai_balance 반영 */
export const THAI_TOPUP_PACKS: Record<ThaiTopupId, ThaiTopupPack> = {
  spark: {
    id: 'spark',
    label: 'Spark 패키지',
    amountThb: 490,
    thaiCredits: 6200,
    tagline: '살자 상점·미션 보조용 가벼운 충전',
  },
  monsoon: {
    id: 'monsoon',
    label: 'Monsoon 패키지',
    amountThb: 1_990,
    thaiCredits: 27_500,
    tagline: '스킨·BGM 장기 즐길 분께',
  },
  royal_elephant: {
    id: 'royal_elephant',
    label: 'Royal Elephant',
    amountThb: 4_900,
    thaiCredits: 72_000,
    tagline: '헤비 컬렉터 — 타이 레이블에 자신 있을 때',
  },
};

export function isThaiTopupId(v: string): v is ThaiTopupId {
  return (THAI_TOPUP_IDS as readonly string[]).includes(v);
}
