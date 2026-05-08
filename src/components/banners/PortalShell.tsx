import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { WingBanners } from './WingBanners';
import { listPremiumBanners } from '@/lib/banners/listPremiumBanners';
import {
  parseSponsorSignalsCookie,
  TJ_SPONSOR_SIGNALS_COOKIE,
} from '@/lib/banners/sponsorIntentSignals';
import type { BannerRouteGroup } from '@/lib/banners/types';

type Props = {
  children: ReactNode;
  /** 이 페이지가 속한 라우트 그룹 (보통 'community' 또는 'boards') */
  routeGroup: BannerRouteGroup;
  /** 본문 최대 너비 (Philgo 는 ~720px 기준) */
  mainMaxWidth?: number;
};

/**
 * Philgo 스타일 3열 그리드: [좌 윙 | 본문 | 우 윙].
 *
 * - ≥769px 에서 윙+본문 3열 · ≤768px 는 본문만 풀폭(모바일 QR 가독성)
 * - 윙 고정폭 168px, 본문은 `min-w-0` 으로 오버플로 방지
 * - 윙 DOM 은 배너가 0 개일 땐 렌더되지 않아 그리드 공간이 “비어 보이는” 일이 없다.
 * - 서버 컴포넌트 → 런타임 JS 없이 동작
 */
export async function PortalShell({ children, routeGroup, mainMaxWidth = 768 }: Props) {
  const cookieStore = await cookies();
  const sponsorSignals = parseSponsorSignalsCookie(
    cookieStore.get(TJ_SPONSOR_SIGNALS_COOKIE)?.value ?? null,
  );

  const banners = await listPremiumBanners({
    placements: ['wing_left', 'wing_right'],
    routeGroups: [routeGroup],
    limitPerPlacement: 8,
    sponsorSignals,
  });

  const left = banners.wing_left;
  const right = banners.wing_right;
  const hasLeft = left.length > 0;
  const hasRight = right.length > 0;

  return (
    <div
      className="tj-portal-shell"
      style={{
        display: 'grid',
        gap: 20,
        maxWidth: mainMaxWidth + 168 * 2 + 40,
        margin: '0 auto',
        padding: '0 12px',
        // 기본(모바일): 한 줄. md(769px)+ 3열
        gridTemplateColumns: 'minmax(0, 1fr)',
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (min-width: 769px) {
              .tj-portal-shell {
                grid-template-columns: ${hasLeft ? '168px' : ''} minmax(0, 1fr) ${hasRight ? '168px' : ''} !important;
                align-items: start !important;
              }
            }
            .tj-portal-shell__main { min-width: 0; }
            @media (max-width: 768.98px) {
              .tj-wing { display: none !important; }
            }
          `,
        }}
      />
      {hasLeft ? <WingBanners side="left" banners={left} /> : null}
      <div className="tj-portal-shell__main">{children}</div>
      {hasRight ? <WingBanners side="right" banners={right} /> : null}
    </div>
  );
}
