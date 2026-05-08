'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTjAnalyticsSessionId } from '@/lib/analytics/clientAnalyticsSession';

type Props = {
  bannerId: string;
  href: string;
  titleSlice: string;
  className?: string;
  prefetch?: boolean;
  children: ReactNode;
};

/**
 * 포털 좌측 스폰서 윙 목록 — `premium_banners` id 기준 클릭 로그 (`wing_left`).
 */
export function PortalWingSponsorTrackedLink({
  bannerId,
  href,
  titleSlice,
  className,
  prefetch = true,
  children,
}: Props) {
  return (
    <div
      onClick={() => {
        void fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: getTjAnalyticsSessionId(),
            events: [
              {
                kind: 'click',
                route: '/',
                meta: {
                  banner_id: bannerId,
                  placement: 'wing_left',
                  banner_title: titleSlice.slice(0, 120),
                },
                ts: Date.now(),
              },
            ],
          }),
          keepalive: true,
        }).catch(() => {});
      }}
    >
      <Link prefetch={prefetch} href={href} className={className}>
        {children}
      </Link>
    </div>
  );
}
