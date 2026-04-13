import type { GovernanceMetric } from './types';

export const GOVERNANCE_METRICS: GovernanceMetric[] = [
  {
    key: 'heroConcurrentMotionCount',
    label: '첫 화면 동시 모션 요소 수',
    gate: { pass: '<= 3', fail: '>= 6' },
  },
  {
    key: 'autoPlayMediaCount',
    label: '사용자 상호작용 전 자동 재생 미디어 수',
    gate: { pass: '= 0', fail: '>= 1' },
  },
  {
    key: 'visualFocusCompeteCount',
    label: 'CTA 외 경쟁 시선 포인트 수',
    gate: { pass: '<= 2', fail: '>= 3' },
  },
  {
    key: 'heroCtaClickThroughRate',
    label: '히어로 CTA 클릭률',
    gate: { pass: 'baseline - 5%p 이내', fail: 'baseline - 8%p 이하' },
  },
  {
    key: 'timeToFirstSearchStart',
    label: '첫 검색/탐색 행동까지 시간',
    gate: { pass: 'baseline +10% 이내', fail: 'baseline +20% 이상' },
  },
  {
    key: 'tokenReuseRatio',
    label: '신규 스타일 토큰 재사용률',
    gate: { pass: '>= 80%', fail: '< 60%' },
  },
  {
    key: 'sharedPrimitiveAdoptionRatio',
    label: '공통 primitive 사용률',
    gate: { pass: '>= 70%', fail: '< 50%' },
  },
  {
    key: 'lcpMsMobileP75',
    label: '모바일 LCP p75',
    gate: { pass: '<= 2500ms', fail: '>= 3000ms' },
  },
  {
    key: 'clsP75',
    label: 'CLS p75',
    gate: { pass: '<= 0.1', fail: '> 0.15' },
  },
  {
    key: 'reducedMotionCoverage',
    label: 'reduced-motion 대응 커버리지',
    gate: { pass: '= 100%', fail: '< 95%' },
  },
];

