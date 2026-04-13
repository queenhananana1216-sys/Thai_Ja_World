import type { EffectTier, SurfaceId } from './types';

export const EFFECT_TIER_ORDER: EffectTier[] = ['lite', 'core', 'immersive'];

export const SURFACE_DEFAULT_TIER: Record<SurfaceId, EffectTier> = {
  home: 'core',
  shop: 'core',
  minihome: 'immersive',
  community: 'lite',
  news: 'lite',
};

const EXPERIMENT_QUERY_KEY = 'tj3d';

function parseTier(raw: string | null | undefined): EffectTier | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'lite' || v === 'core' || v === 'immersive') return v;
  return null;
}

export function parseTierFromQuery(search: string): EffectTier | null {
  const params = new URLSearchParams(search);
  return parseTier(params.get(EXPERIMENT_QUERY_KEY));
}

export function parseTierFromStorage(): EffectTier | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseTier(window.localStorage.getItem('tj_effect_tier'));
  } catch {
    return null;
  }
}

export function saveTierToStorage(tier: EffectTier): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('tj_effect_tier', tier);
  } catch {
    // storage blocked: ignore
  }
}

export function resolveTierRank(tier: EffectTier): number {
  return EFFECT_TIER_ORDER.indexOf(tier);
}

export function clampTierByBudget(baseTier: EffectTier, maxTier: EffectTier): EffectTier {
  return resolveTierRank(baseTier) <= resolveTierRank(maxTier) ? baseTier : maxTier;
}

