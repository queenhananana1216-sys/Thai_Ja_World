import type { ReactNode } from 'react';
import Link from 'next/link';
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
      <PortalShell routeGroup="community">
        <aside
          className="card"
          style={{
            marginBottom: 14,
            padding: '14px 16px',
            borderRadius: 16,
            borderColor: 'rgba(148, 163, 184, 0.36)',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.95), rgba(15,23,42,0.86))',
            color: '#e2e8f0',
          }}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.08em', color: '#facc15' }}>
                참여 공간
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link prefetch={true} href="/community/boards" className="global-header__link">
                  자유게시판
                </Link>
                <Link prefetch={true} href="/community/boards?cat=info" className="global-header__link">
                  정보공유
                </Link>
                <Link prefetch={true} href="/community/boards?cat=flea" className="global-header__link">
                  번개장터
                </Link>
                <Link prefetch={true} href="/community/boards?cat=job" className="global-header__link">
                  구인구직
                </Link>
              </div>
            </div>
            <div>
              <p style={{ margin: '0 0 8px', fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.08em', color: '#93c5fd' }}>
                공식 정보
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Link prefetch={true} href="/news" className="global-header__link">
                  태국 뉴스
                </Link>
                <Link prefetch={true} href="/tips" className="global-header__link">
                  비자·생활 꿀팁
                </Link>
              </div>
            </div>
          </div>
        </aside>
        {children}
      </PortalShell>
    </div>
  );
}
