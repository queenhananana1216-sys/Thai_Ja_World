'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import { fetchLandingStats } from '@/lib/landing/api';
import type { StatsResponse } from '@/lib/landing/types';

interface UseStatsResult {
  stats: StatsResponse;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  retry: () => void;
}

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<StatsResponse>(LANDING_DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState<number>(0);

  const retry = useCallback(() => {
    setRequestKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function loadStats() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextStats = await fetchLandingStats(controller.signal);
        if (!mounted) {
          return;
        }
        setStats(nextStats);
      } catch (error) {
        if (!mounted) {
          return;
        }
        const message = error instanceof Error ? error.message : '통계를 불러오지 못했습니다.';
        setErrorMessage(message);
        setStats(LANDING_DEFAULT_STATS);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [requestKey]);

  return useMemo(
    () => ({
      stats,
      isLoading,
      isError: errorMessage !== null,
      errorMessage,
      retry,
    }),
    [stats, isLoading, errorMessage, retry]
  );
}
