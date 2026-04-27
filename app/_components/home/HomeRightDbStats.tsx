import { loadCachedPublicSiteStats } from '@/lib/landing/publicSiteStats';
import styles from './home-hub.module.css';

function fmtCount(n: number): string {
  return n.toLocaleString('ko-KR');
}

export async function HomeRightDbStats() {
  try {
    const s = await loadCachedPublicSiteStats();

    return (
      <section className={styles.sideCard} aria-label="사이트 누적 집계">
        <h2 className={styles.sideTitleMain}>누적 DB</h2>
        <div className={styles.dbStatsGrid}>
          <div className={styles.dbStatCell}>
            <span className={styles.dbStatLbl}>가입</span>
            <span className={styles.dbStatVal}>{fmtCount(s.memberCount)}</span>
          </div>
          <div className={styles.dbStatCell}>
            <span className={styles.dbStatLbl}>게시글</span>
            <span className={styles.dbStatVal}>{fmtCount(s.postCount)}</span>
          </div>
          <div className={styles.dbStatCell}>
            <span className={styles.dbStatLbl}>로컬</span>
            <span className={styles.dbStatValAccent}>{fmtCount(s.spotCount)}</span>
          </div>
          <div className={styles.dbStatCell}>
            <span className={styles.dbStatLbl}>뉴스</span>
            <span className={styles.dbStatValAccent}>{fmtCount(s.newsCount)}</span>
          </div>
        </div>
        {s.lastUpdatedAt ? (
          <p className={styles.dbStatFoot}>
            {new Date(s.lastUpdatedAt).toLocaleString('ko-KR', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : null}
      </section>
    );
  } catch (e) {
    return (
      <section className={styles.sideCard} aria-label="사이트 누적 집계">
        <p className={styles.errLine}>{e instanceof Error ? e.message : '집계 오류'}</p>
      </section>
    );
  }
}
