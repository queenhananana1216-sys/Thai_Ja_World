export type ThreeDVariant = 'control' | 'lite_core' | 'core_immersive';

export const THREE_D_EXPERIMENT = {
  key: 'home_3d_renewal_v1',
  variants: ['control', 'lite_core', 'core_immersive'] as ThreeDVariant[],
  kpis: {
    business: ['heroCtaClickThroughRate', 'guestExploreRate', 'weeklyReturnRate'],
    ux: ['timeToFirstSearchStart', 'scrollDepthP75', 'firstInputDelayMsP75'],
  },
  rollbackThreshold: {
    heroCtaDropPp: 8,
    mobileLcpIncreasePercent: 20,
    bounceRateIncreasePp: 8,
  },
} as const;

