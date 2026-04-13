import type { RolloutWave, SurfaceId } from './types';

export const RENEWAL_WAVE_SURFACES: Record<RolloutWave, SurfaceId[]> = {
  waveA: ['home'],
  waveB: ['shop', 'minihome'],
  waveC: ['community', 'news'],
};

export const RENEWAL_WAVE_FILES: Record<RolloutWave, string[]> = {
  waveA: [
    'app/page.tsx',
    'app/layout.tsx',
    'app/_components/HomePageClient.tsx',
    'app/globals.css',
  ],
  waveB: [
    'app/shop/[slug]/ShopMinihomeClient.tsx',
    'app/minihome/_components/MinihomeRoomView.tsx',
    'app/minihome/page.tsx',
    'app/globals.css',
  ],
  waveC: [
    'app/community/boards/page.tsx',
    'app/news/[id]/page.tsx',
    'app/globals.css',
  ],
};

