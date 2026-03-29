'use client';

import type { ReactNode } from 'react';
import { MinihomeOverlayProvider } from '../minihome/_components/MinihomeOverlay';
import LastSeenHeartbeat from './LastSeenHeartbeat';
import { HeroSiteCopyProvider } from '@/contexts/HeroSiteCopyContext';
import { StyleScorePreviewProvider } from '@/contexts/StyleScorePreviewContext';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';

export default function Providers({
  children,
  heroSiteCopy,
}: {
  children: ReactNode;
  heroSiteCopy: MergedHeroSiteCopy;
}) {
  return (
    <HeroSiteCopyProvider value={heroSiteCopy}>
      <StyleScorePreviewProvider>
        <MinihomeOverlayProvider>
          <LastSeenHeartbeat />
          {children}
        </MinihomeOverlayProvider>
      </StyleScorePreviewProvider>
    </HeroSiteCopyProvider>
  );
}
