'use client';

import type { ReactNode } from 'react';
import { MinihomeOverlayProvider } from '../minihome/_components/MinihomeOverlay';
import LastSeenHeartbeat from './LastSeenHeartbeat';
import { StyleScorePreviewProvider } from '@/contexts/StyleScorePreviewContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleScorePreviewProvider>
      <MinihomeOverlayProvider>
        <LastSeenHeartbeat />
        {children}
      </MinihomeOverlayProvider>
    </StyleScorePreviewProvider>
  );
}
