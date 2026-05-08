'use client';

import GuestGateLink from '@app/_components/GuestGateLink';
import { useEffect } from 'react';
import type { Locale } from '@/i18n/types';
import type { BannerPlacement, PublicBanner } from '@/lib/banners/types';
import { getTjAnalyticsSessionId, shouldSendBannerImpressionOnce } from '@/lib/analytics/clientAnalyticsSession';
import { normalizeContainerText } from '@/lib/text/normalizeDisplayText';

type Props = {
  banner: PublicBanner;
  placement: BannerPlacement;
  locale: Locale;
  isLoggedIn: boolean;
};

function postTrack(payload: Record<string, unknown>) {
  void fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/**
 * 포털 퀵메뉴 1·7번 칸 — 이미지 원형 타일 + 클릭/노출을 `site_analytics` 에 기록
 */
export function SponsorQuickMenuTile({ banner, placement, locale, isLoggedIn }: Props) {
  const href = banner.href?.trim() || '#';
  const label = normalizeContainerText(banner.title, 52);
  const sub = banner.subtitle ? normalizeContainerText(banner.subtitle, 36) : '';
  const sponsorAria =
    locale === 'th' ? `สปอนเซอร์: ${label}` : locale === 'ko' ? `스폰서: ${label}` : `Sponsor: ${label}`;

  useEffect(() => {
    if (!shouldSendBannerImpressionOnce(banner.id)) return;
    postTrack({
      sessionId: getTjAnalyticsSessionId(),
      events: [
        {
          kind: 'view',
          route: '/',
          meta: {
            banner_id: banner.id,
            placement,
            banner_impression: true,
            banner_title: banner.title.slice(0, 120),
          },
          ts: Date.now(),
        },
      ],
    });
  }, [banner.id, banner.title, placement]);

  const trackingClick = () => {
    postTrack({
      sessionId: getTjAnalyticsSessionId(),
      events: [
        {
          kind: 'click',
          route: '/',
          meta: {
            banner_id: banner.id,
            placement,
            banner_title: banner.title.slice(0, 120),
          },
          ts: Date.now(),
        },
      ],
    });
  };

  const circle = (
    <span
      className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-400/35 bg-slate-900/95 text-[0.65rem] font-bold text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:h-14 md:w-14"
      aria-hidden
    >
      {banner.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="px-1 text-center leading-tight">ADS</span>
      )}
      {banner.badgeText ? (
        <span className="absolute right-0.5 top-0.5 rounded bg-black/72 px-[3px] py-px text-[8px] font-extrabold uppercase text-amber-200">
          AD
        </span>
      ) : null}
    </span>
  );

  const textBlock = (
    <>
      <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight max-[768px]:text-[0.68rem] md:text-sm md:leading-snug">
        {label}
      </span>
      {sub ? (
        <span className="line-clamp-1 w-full text-center text-[0.625rem] text-slate-300/95 md:text-xs">{sub}</span>
      ) : null}
    </>
  );

  const shellClass =
    'flex touch-manipulation flex-col items-center gap-1 rounded-xl px-0.5 py-0.5 text-gray-100 ring-1 ring-amber-500/25 bg-slate-950/40 active:opacity-90 md:gap-2 md:px-1 md:py-1';

  if (href === '#') {
    return (
      <div className="min-w-0" onClick={() => trackingClick()}>
        <div className={shellClass} role="figure" aria-label={sponsorAria}>
          {circle}
          {textBlock}
        </div>
      </div>
    );
  }

  if (/^https?:\/\//i.test(href)) {
    return (
      <div className="min-w-0">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className={`block no-underline ${shellClass}`}
          aria-label={sponsorAria}
          onClick={() => trackingClick()}
        >
          {circle}
          {textBlock}
        </a>
      </div>
    );
  }

  return (
    <div className="min-w-0" onClick={() => trackingClick()}>
      <GuestGateLink
        href={href}
        isLoggedIn={isLoggedIn}
        forcePublic
        className={`flex flex-col items-center gap-1 text-inherit no-underline md:gap-2 ${shellClass}`}
        title={sponsorAria}
      >
        {circle}
        {textBlock}
      </GuestGateLink>
    </div>
  );
}
