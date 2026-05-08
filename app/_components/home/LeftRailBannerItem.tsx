'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTjAnalyticsSessionId } from '@/lib/analytics/clientAnalyticsSession';

type Props = {
  bannerId: string;
  bannerTitle: string;
  href: string;
  className?: string;
  children: ReactNode;
};

export function LeftRailBannerItem({ bannerId, bannerTitle, href, className, children }: Props) {
  if (href === '#') {
    return <div className={className}>{children}</div>;
  }

  const external = /^https?:\/\//i.test(href);

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
                  placement: 'home_strip',
                  banner_title: bannerTitle.slice(0, 120),
                  surface: 'home_left_rail',
                },
                ts: Date.now(),
              },
            ],
          }),
          keepalive: true,
        }).catch(() => {});
      }}
    >
      <Link
        href={href}
        className={className}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer sponsored' : undefined}
      >
        {children}
      </Link>
    </div>
  );
}
