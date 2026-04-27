import { loadCachedPublicSiteStats } from '@/lib/landing/publicSiteStats';
import styles from './home-hub.module.css';

function fmtCount(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtTs(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/** 서비스 롤 DB 집계 — 가입·게시·로컬 스팟·뉴스 (캐시 10분) */
export async function HomeRightSiteStats() {
  try {
    const s = await loadCachedPublicSiteStats();
    return (
      <section className={styles.sideCard} aria-label="사이트 누적 통계">
        <h2 className={styles.sideTitleMain}>실데이터 집계</h2>
        <div className={styles.siteTotalsGrid4} role="list">
          <div className={styles.siteTotalCell} role="listitem">
            <div className={styles.siteTotalLabel}>가입자</div>
            <div className={styles.siteTotalNum}>{fmtCount(s.memberCount)}</div>
          </div>
          <div className={styles.siteTotalCell} role="listitem">
            <div className={styles.siteTotalLabel}>게시글</div>
            <div className={styles.siteTotalNumAccent}>{fmtCount(s.postCount)}</div>
          </div>
          <div className={styles.siteTotalCell} role="listitem">
            <div className={styles.siteTotalLabel}>로컬 스팟</div>
            <div className={styles.siteTotalNum}>{fmtCount(s.spotCount)}</div>
          </div>
          <div className={styles.siteTotalCell} role="listitem">
            <div className={styles.siteTotalLabel}>뉴스</div>
            <div className={styles.siteTotalNum}>{fmtCount(s.newsCount)}</div>
          </div>
        </div>
        <p className={styles.sideRow} style={{ marginTop: '0.28rem', fontSize: '0.52rem' }}>
          갱신 {fmtTs(s.lastUpdatedAt)}
        </p>
      </section>
    );
  } catch (e) {
    return (
      <section className={styles.sideCard} aria-label="사이트 누적 통계">
        <h2 className={styles.sideTitleMain}>실데이터 집계</h2>
        <p className={styles.errLine}>{e instanceof Error ? e.message : '집계 불가'}</p>
      </section>
    );
  }
}
