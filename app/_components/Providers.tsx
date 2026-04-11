'use client';

import type { ReactNode } from 'react';
import { MinihomeOverlayProvider } from '../minihome/_components/MinihomeOverlay';
import LastSeenHeartbeat from './LastSeenHeartbeat';
import { HeroSiteCopyProvider } from '@/contexts/HeroSiteCopyContext';
import { StyleScorePreviewProvider } from '@/contexts/StyleScorePreviewContext';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';
import { TooltipProvider } from '@/components/ui/tooltip';

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
        <TooltipProvider delayDuration={200}>
          <MinihomeOverlayProvider>
            <LastSeenHeartbeat />
            {children}
          </MinihomeOverlayProvider>
        </TooltipProvider>
      </StyleScorePreviewProvider>
    </HeroSiteCopyProvider>
  );
}
