import type { EffectTier } from './types';
import { clampTierByBudget } from './system';

export type Runtime3dState = {
  reducedMotion: boolean;
  lowPowerDevice: boolean;
  effectiveMaxTier: EffectTier;
};

export function readRuntime3dState(): Runtime3dState {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      lowPowerDevice: false,
      effectiveMaxTier: 'core',
    };
  }

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  const lowPowerDevice = memory <= 4 || cores <= 4 || coarsePointer;
  const effectiveMaxTier: EffectTier = prefersReduced ? 'lite' : lowPowerDevice ? 'core' : 'immersive';
  return {
    reducedMotion: prefersReduced,
    lowPowerDevice,
    effectiveMaxTier,
  };
}

export function resolveRuntimeTier(preferredTier: EffectTier, state: Runtime3dState): EffectTier {
  const reducedSafe = state.reducedMotion ? 'lite' : preferredTier;
  return clampTierByBudget(reducedSafe, state.effectiveMaxTier);
}

