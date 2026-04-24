import type { CSSProperties } from 'react';
import { BannerCard } from './BannerCard';
import type { PublicBanner } from '@/lib/banners/types';

type Props = {
  /** 'left' | 'right' — aria-label 과 grid area 에 사용 */
  side: 'left' | 'right';
  banners: PublicBanner[];
  /** 배너가 없을 땐 DOM 을 그리지 않아 그리드 공간이 비어 보이지 않게. */
  hideWhenEmpty?: boolean;
  /** 상단 고정(스크롤 따라올 때) */
  sticky?: boolean;
};

const ASIDE_STYLE_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 0,
  margin: 0,
};

export function WingBanners({ side, banners, hideWhenEmpty = true, sticky = true }: Props) {
  if (hideWhenEmpty && banners.length === 0) return null;

  return (
    <aside
      aria-label={side === 'left' ? '좌측 스폰서 배너' : '우측 스폰서 배너'}
      className={`tj-wing tj-wing--${side}`}
      style={{
        ...ASIDE_STYLE_BASE,
        position: sticky ? 'sticky' : 'static',
        top: sticky ? 92 : undefined,
        alignSelf: 'start',
      }}
    >
      {banners.map((b) => (
        <BannerCard key={b.id} banner={b} />
      ))}
    </aside>
  );
}
