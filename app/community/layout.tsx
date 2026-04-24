import type { ReactNode } from 'react';
import { PortalShell } from '@/components/banners/PortalShell';

/**
 * /community/* 영역에 Philgo 스타일 3열 그리드를 주입.
 *
 * - 좌/우 윙 배너 는 `premium_banners.placement = wing_left | wing_right`,
 *   `route_group ∈ { all, community }` 에서 가져온다.
 * - 배너가 없으면 윙 컬럼을 렌더하지 않아 본문이 중앙에 깔끔히 남는다.
 * - 모바일(<1024px)은 윙을 숨기고 본문만 풀폭.
 */
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ paddingTop: 4, paddingBottom: 40 }}>
      <PortalShell routeGroup="community">{children}</PortalShell>
    </div>
  );
}
