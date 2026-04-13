export const RENDER_BUDGET = {
  maxAnimatedElementsAboveFold: 3,
  maxBackgroundLayersPerSurface: 3,
  maxInitialJsKbGzip: 220,
  maxLongTasksInFirst10s: 12,
} as const;

export const ACCESSIBILITY_GUARDRAIL = {
  minTextContrastRatio: 4.5,
  requireVisibleFocusRing: true,
  requireKeyboardReachableCta: true,
  requireReducedMotionFallback: true,
} as const;

