'use client';

import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react';
import SiteSearch from './SiteSearch';
import type { Dictionary } from '@/i18n/dictionaries';

type Props = { dict: Pick<Dictionary, 'search'> };

type IslandState = { hasError: boolean };

class SearchErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, IslandState> {
  override state: IslandState = { hasError: false };

  static getDerivedStateFromError(): IslandState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalNavSearchIsland]', error.message, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ReadonlySearchFallback({ dict }: Props) {
  return (
    <div className="w-full min-w-0">
      <label className="sr-only" htmlFor="tj-header-search-fallback">
        {dict.search.ariaLabel}
      </label>
      <input
        id="tj-header-search-fallback"
        type="search"
        readOnly
        tabIndex={0}
        placeholder={dict.search.placeholder}
        className="w-full rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
      />
      <p className="mt-1 text-center text-[10px] text-slate-600 md:text-left">{dict.search.headerBarLabel}</p>
    </div>
  );
}

export default function GlobalNavSearchIsland({ dict }: Props) {
  const fallback = <ReadonlySearchFallback dict={dict} />;
  return (
    <SearchErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <SiteSearch variant="header" />
      </Suspense>
    </SearchErrorBoundary>
  );
}
