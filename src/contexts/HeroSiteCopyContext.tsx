'use client';

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';
import { getMergedDefaultsFromI18n } from '@/lib/siteCopy/heroCopyDefaults';

const HeroSiteCopyContext = createContext<MergedHeroSiteCopy | null>(null);

export function HeroSiteCopyProvider({
  value,
  children,
}: {
  value: MergedHeroSiteCopy;
  children: ReactNode;
}) {
  return <HeroSiteCopyContext.Provider value={value}>{children}</HeroSiteCopyContext.Provider>;
}

export function useHeroSiteCopy(): MergedHeroSiteCopy {
  const v = useContext(HeroSiteCopyContext);
  return v ?? getMergedDefaultsFromI18n();
}
