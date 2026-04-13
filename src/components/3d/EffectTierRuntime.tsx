'use client';

import { useEffect, useMemo, useState } from 'react';
import { THREE_D_EXPERIMENT, type ThreeDVariant } from '@/lib/3d/experiments';
import { parseTierFromQuery, parseTierFromStorage, saveTierToStorage } from '@/lib/3d/system';
import { readRuntime3dState, resolveRuntimeTier } from '@/lib/3d/runtime';
import type { EffectTier } from '@/lib/3d/types';

function parseVariant(raw: string | null | undefined): ThreeDVariant | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'control' || v === 'lite_core' || v === 'core_immersive') return v;
  return null;
}

export function EffectTierRuntime({ preferredTier = 'core' }: { preferredTier?: EffectTier }) {
  const [resolved, setResolved] = useState<EffectTier>('core');
  const runtime = useMemo(() => readRuntime3dState(), []);

  useEffect(() => {
    const queryTier = parseTierFromQuery(window.location.search);
    const storageTier = parseTierFromStorage();
    const requested = queryTier ?? storageTier ?? preferredTier;
    const next = resolveRuntimeTier(requested, runtime);

    setResolved(next);
    saveTierToStorage(next);

    const queryVariant = parseVariant(new URLSearchParams(window.location.search).get('tj3dvar'));
    const storageVariant = parseVariant(window.localStorage.getItem('tj_3d_variant'));
    const variant: ThreeDVariant =
      queryVariant ??
      storageVariant ??
      (next === 'immersive' ? 'core_immersive' : next === 'lite' ? 'control' : 'lite_core');

    const safeVariant: ThreeDVariant = THREE_D_EXPERIMENT.variants.includes(variant)
      ? variant
      : 'control';
    window.localStorage.setItem('tj_3d_variant', safeVariant);

    document.documentElement.dataset.tjTier = next;
    document.documentElement.dataset.tj3dVariant = safeVariant;
    document.documentElement.dataset.tjReducedMotion = runtime.reducedMotion ? '1' : '0';
    document.documentElement.dataset.tjLowPower = runtime.lowPowerDevice ? '1' : '0';
  }, [preferredTier, runtime]);

  return <span hidden data-tj-tier-runtime={resolved} aria-hidden />;
}

