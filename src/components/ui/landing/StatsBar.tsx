'use client';

import { Component, type ReactNode } from 'react';
import { useStats } from '@/hooks/useStats';
import type { StatsResponse } from '@/lib/landing/types';

interface StatsBoundaryState {
  hasError: boolean;
}

const STATS_VISIBILITY_MODE = process.env.NEXT_PUBLIC_LANDING_STATS_VISIBILITY_MODE ?? 'curated';
const STAT_FLOORS = {
  postCount: Number(process.env.NEXT_PUBLIC_LANDING_STATS_FLOOR_POST ?? '120'),
  spotCount: Number(process.env.NEXT_PUBLIC_LANDING_STATS_FLOOR_SPOT ?? '30'),
  newsCount: Number(process.env.NEXT_PUBLIC_LANDING_STATS_FLOOR_NEWS ?? '180'),
  memberCount: Number(process.env.NEXT_PUBLIC_LANDING_STATS_FLOOR_MEMBER ?? '300'),
} as const;

class StatsBoundary extends Component<{ children: ReactNode }, StatsBoundaryState> {
  public override state: StatsBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): StatsBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: unknown) {
    console.error('[StatsBar] render error', error);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          통계 바를 렌더링하는 중 오류가 발생했습니다.
        </div>
      );
    }
    return this.props.children;
  }
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function StatsItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center backdrop-blur-xl">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</dt>
      <dd className="mt-2 text-2xl font-bold text-amber-200">{value}</dd>
    </div>
  );
}

function toDisplayValue(actual: number, floor: number): string {
  if (STATS_VISIBILITY_MODE === 'live') {
    return formatCount(actual);
  }
  const safeFloor = Number.isFinite(floor) ? floor : 0;
  const display = Math.max(actual, safeFloor);
  return actual < display ? `${formatCount(display)}+` : formatCount(display);
}

function formatLastUpdated(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString('ko-KR', { hour12: false });
}

function StatsContent({ stats }: { stats: StatsResponse }) {
  const lastUpdatedLabel = formatLastUpdated(stats.lastUpdatedAt);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="rounded-full border border-violet-300/30 bg-violet-400/10 px-2.5 py-1">
          {STATS_VISIBILITY_MODE === 'live' ? '실시간 지표 모드' : '가공 지표 모드 (로직 유지)'}
        </span>
        {lastUpdatedLabel ? (
          <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-100">
            자동 파이프라인 최근 업데이트: {lastUpdatedLabel}
          </span>
        ) : null}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsItem label="누적 게시글" value={toDisplayValue(stats.postCount, STAT_FLOORS.postCount)} />
        <StatsItem label="등록 업체" value={toDisplayValue(stats.spotCount, STAT_FLOORS.spotCount)} />
        <StatsItem label="AI 뉴스 발행" value={toDisplayValue(stats.newsCount, STAT_FLOORS.newsCount)} />
        <StatsItem label="활성 회원" value={toDisplayValue(stats.memberCount, STAT_FLOORS.memberCount)} />
      </dl>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-700/70" />
      ))}
    </div>
  );
}

function StatsBarBody() {
  const { stats, isLoading, isError, errorMessage, retry } = useStats();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p>통계를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        {errorMessage ? <p className="mt-1 text-xs text-amber-700">{errorMessage}</p> : null}
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return <StatsContent stats={stats} />;
}

export function StatsBar() {
  return (
    <StatsBoundary>
      <StatsBarBody />
    </StatsBoundary>
  );
}
