'use client';

import type { ReactNode } from 'react';
import LastSeenHeartbeat from './LastSeenHeartbeat';
import { StyleScorePreviewProvider } from '@/contexts/StyleScorePreviewContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleScorePreviewProvider>
      <LastSeenHeartbeat />
      {children}
    </StyleScorePreviewProvider>
  );
}
