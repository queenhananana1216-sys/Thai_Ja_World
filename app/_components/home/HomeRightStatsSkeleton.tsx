import styles from './home-hub.module.css';

/** 우측 통계 카드 Suspense 폴백 — RPC·RSC 로딩 중 */
export function HomeRightStatsSkeleton() {
  return (
    <aside className={`${styles.sideCard} ${styles.sideSkeleton}`} aria-hidden>
      <div className={styles.skTitle} />
      <div className={styles.skMegaRow}>
        <div className={styles.skMega} />
        <div className={styles.skMega} />
      </div>
      <div className={styles.skDivider} />
      <div className={styles.skTitle} style={{ width: '58%' }} />
      <div className={styles.skLine} />
      <div className={styles.skLine} />
      <div className={styles.skLine} style={{ width: '72%' }} />
    </aside>
  );
}
