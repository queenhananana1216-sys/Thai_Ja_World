import { HomeRightStatsSkeleton } from './HomeRightStatsSkeleton';
import styles from './home-hub.module.css';

export type HomeSkeletonVariant = 'marquee' | 'slider' | 'panel' | 'feed' | 'side' | 'left' | 'fx';

/** Suspense 폴백 — 레이아웃 붕괴 방지용 초소형 스켈레톤 */
export function HomeCompactSkeleton({ variant }: { variant: HomeSkeletonVariant }) {
  if (variant === 'marquee') {
    return (
      <div className={styles.marqueeWrap} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '1.85rem' }} />
      </div>
    );
  }
  if (variant === 'slider') {
    return (
      <div className={styles.sliderHost} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '4.5rem', background: 'rgba(15,23,42,0.35)' }} />
      </div>
    );
  }
  if (variant === 'panel') {
    return (
      <div className={styles.panel} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '7.5rem' }} />
      </div>
    );
  }
  if (variant === 'feed') {
    return (
      <div className={styles.feed} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '10rem' }} />
      </div>
    );
  }
  if (variant === 'left') {
    return (
      <div className={styles.leftRailSkel} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '5rem' }} />
        <div className={styles.pulse} style={{ minHeight: '5rem' }} />
      </div>
    );
  }
  if (variant === 'fx') {
    return (
      <div className={styles.fxSkelCard} aria-hidden>
        <div className={styles.pulse} style={{ minHeight: '2.6rem' }} />
      </div>
    );
  }
  return <HomeRightStatsSkeleton />;
}
