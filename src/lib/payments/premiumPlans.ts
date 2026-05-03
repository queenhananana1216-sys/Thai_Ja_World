export const PREMIUM_PLAN_IDS = ['basic', 'pro', 'sponsor'] as const;
export type PremiumPlanId = (typeof PREMIUM_PLAN_IDS)[number];

export type PremiumPlanDisplay = {
  id: PremiumPlanId;
  label: string;
  priceLabel: string;
  amountKrw: number;
  blurb: string;
  highlights: string[];
  accent: string;
};

/** Stripe Checkout — KRW zero-decimal unit_amount */
export const PREMIUM_PLANS: Record<PremiumPlanId, Omit<PremiumPlanDisplay, 'id'>> = {
  basic: {
    label: 'Basic',
    priceLabel: '₩9,900',
    amountKrw: 9_900,
    blurb: '광고 부담을 줄인 미니홈·기본 배너 노출 제어에 적합합니다.',
    highlights: ['미니홈 경량 광고 제거', '프로필 프리미엄 배지', '우선 고객 지원 큐'],
    accent: '#38bdf8',
  },
  pro: {
    label: 'Pro',
    priceLabel: '₩29,900',
    amountKrw: 29_900,
    blurb: '크리에이터·로컬 사장님용 — 노출과 브랜딩을 한 단계 올립니다.',
    highlights: ['스폰서 배너 슬롯', '미니홈 테마 프리셋 잠금 해제', '분석 리포트 요약'],
    accent: '#a78bfa',
  },
  sponsor: {
    label: 'Sponsor',
    priceLabel: '₩99,000',
    amountKrw: 99_000,
    blurb: '브랜드 스폰서십 — 허브·이벤트 노출과 공동 캠페인 우선권.',
    highlights: ['허브 스폰서 배너', '시즌 이벤트 우선 노출', '전용 계정 매니저(영업 연동)'],
    accent: '#fbbf24',
  },
};

export function isPremiumPlanId(v: string): v is PremiumPlanId {
  return (PREMIUM_PLAN_IDS as readonly string[]).includes(v);
}
