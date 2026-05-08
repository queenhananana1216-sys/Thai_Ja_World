'use client';

import type { BannerPlacement, PublicBanner } from '@/lib/banners/types';
import { getTjAnalyticsSessionId, shouldSendBannerImpressionOnce } from '@/lib/analytics/clientAnalyticsSession';
import { BannerCard } from './BannerCard';
import { useEffect } from 'react';

type Props = {
  banner: PublicBanner;
  placement: BannerPlacement;
  /** 집계용 논리 경로 — 홈 스트립이면 `/` 등 */
  trackingRoute?: string;
  fallbackAspect?: `${number} / ${number}`;
  maxWidth?: number;
  /** 세션당 1회 `view` 로 노출 추정(CTR 분모). 기본값 false 로 기존 트래픽 급증 방지 → 스폰서 슬롯에서 켭니다 */
  trackImpression?: boolean;
};

function postTrack(body: Record<string, unknown>) {
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

/**
 * 배너 탐색 클릭을 `site_analytics`(kind=click, meta.banner_id)로 남깁니다.
 * 내부 `<a>/<Link>` 클릭이 버블되며 상위 핸들러가 한 번 실행됩니다.
 */
export function BannerCardWithTracking({
  banner,
  placement,
  trackingRoute = '/',
  fallbackAspect,
  maxWidth,
  trackImpression = false,
}: Props) {
  useEffect(() => {
    if (!trackImpression || !banner.id) return;
    if (!shouldSendBannerImpressionOnce(banner.id)) return;
    const sid = getTjAnalyticsSessionId();
    postTrack({
      sessionId: sid,
      events: [
        {
          kind: 'view',
          route: trackingRoute,
          meta: {
            banner_id: banner.id,
            placement,
            banner_impression: true,
            banner_title: typeof banner.title === 'string' ? banner.title.slice(0, 120) : '',
          },
          ts: Date.now(),
        },
      ],
    });
  }, [banner.id, banner.title, placement, trackImpression, trackingRoute]);

  return (
    <div
      onClick={() => {
        const sid = getTjAnalyticsSessionId();
        postTrack({
          sessionId: sid,
          events: [
            {
              kind: 'click',
              route: trackingRoute,
              meta: {
                banner_id: banner.id,
                placement,
                banner_title: typeof banner.title === 'string' ? banner.title.slice(0, 120) : '',
              },
              ts: Date.now(),
            },
          ],
        });
      }}
    >
      <BannerCard banner={banner} fallbackAspect={fallbackAspect} maxWidth={maxWidth} />
    </div>
  );
}
