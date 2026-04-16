import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import type { StatsResponse } from '@/lib/landing/types';

function toSafeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export async function fetchLandingStats(signal?: AbortSignal): Promise<StatsResponse> {
  const response = await fetch('/api/stats', {
    method: 'GET',
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load stats (${response.status})`);
  }

  const payload = (await response.json()) as Partial<StatsResponse> | null;
  if (!payload) {
    return LANDING_DEFAULT_STATS;
  }

  return {
    postCount: toSafeNumber(payload.postCount),
    spotCount: toSafeNumber(payload.spotCount),
    newsCount: toSafeNumber(payload.newsCount),
    memberCount: toSafeNumber(payload.memberCount),
    lastUpdatedAt:
      typeof payload.lastUpdatedAt === 'string' && payload.lastUpdatedAt.trim().length > 0
        ? payload.lastUpdatedAt
        : null,
  };
}
