'use client';

import { Suspense, type ReactNode } from 'react';
import { MinihomeOverlayProvider } from '../minihome/_components/MinihomeOverlay';
import GlobalUxTracker from './GlobalUxTracker';
import LastSeenHeartbeat from './LastSeenHeartbeat';
import { EffectTierRuntime } from '@/components/3d/EffectTierRuntime';
import { GlobalLanguageProvider } from '@/contexts/GlobalLanguageContext';
import { HeroSiteCopyProvider } from '@/contexts/HeroSiteCopyContext';
import { StyleScorePreviewProvider } from '@/contexts/StyleScorePreviewContext';
import type { Locale } from '@/i18n/types';
import type { MergedHeroSiteCopy } from '@/lib/siteCopy/heroCopyDefaults';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function Providers({
  children,
  heroSiteCopy,
  initialLocale,
}: {
  children: ReactNode;
  heroSiteCopy: MergedHeroSiteCopy;
  initialLocale: Locale;
}) {
  return (
    <GlobalLanguageProvider initialLocale={initialLocale}>
      <HeroSiteCopyProvider value={heroSiteCopy}>
        <StyleScorePreviewProvider>
          <TooltipProvider delayDuration={200}>
            <MinihomeOverlayProvider>
              <EffectTierRuntime preferredTier="core" />
              {/* useSearchParams() 를 쓰므로 정적 페이지 프리렌더 시 Suspense 로 감싸야 한다 (Next 15 요구사항) */}
              <Suspense fallback={null}>
                <GlobalUxTracker />
              </Suspense>
              <LastSeenHeartbeat />
              {children}
            </MinihomeOverlayProvider>
          </TooltipProvider>
        </StyleScorePreviewProvider>
      </HeroSiteCopyProvider>
    </GlobalLanguageProvider>
  );
}
