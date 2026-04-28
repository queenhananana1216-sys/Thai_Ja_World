import { fetchHomeUxSnapshot } from './home-queries';
import styles from './home-hub.module.css';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

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

export async function HomeRightUxStats() {
  try {
    const ux = await fetchHomeUxSnapshot();
    const { window_start, totals, error: uxErr } = ux;

    return (
      <aside className={styles.sideCard} aria-label="UX 스냅샷">
        <h2 className={styles.sideTitleMain}>UX 5m</h2>
        {uxErr ? <HomeGlassEmptyState label="UX 스냅샷 빈 상태" /> : null}
        {totals ? (
          <div className={styles.uxMiniGrid}>
            {typeof totals.total === 'number' ? (
              <p className={styles.sideRow}>
                샘플 이벤트 <span className={styles.sideVal}>{totals.total}</span>
              </p>
            ) : null}
            <p className={styles.sideRow}>
              페이지뷰 <span className={styles.sideVal}>{totals.page_view ?? 0}</span>
            </p>
            <p className={styles.sideRow}>
              클릭 <span className={styles.sideVal}>{totals.click ?? 0}</span>
            </p>
            <p className={styles.sideRow}>
              데드클릭 <span className={styles.sideVal}>{totals.dead_click ?? 0}</span>
            </p>
            {typeof totals.dead_click_rate === 'number' ? (
              <p className={styles.sideRow}>
                데드클릭율{' '}
                <span className={styles.sideVal}>{(totals.dead_click_rate * 100).toFixed(1)}%</span>
              </p>
            ) : null}
            <p className={styles.sideRow}>
              JS 오류 <span className={styles.sideVal}>{totals.js_error ?? 0}</span>
            </p>
            <p className={styles.sideRow}>
              API 오류 <span className={styles.sideVal}>{totals.api_error ?? 0}</span>
            </p>
            {typeof totals.local_views === 'number' ? (
              <p className={styles.sideRow}>
                /local 조회 <span className={styles.sideVal}>{totals.local_views}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className={styles.sideRow} style={{ marginTop: '0.35rem', fontSize: '0.52rem' }}>
          창 기준: {fmtTs(window_start)}
        </p>
      </aside>
    );
  } catch {
    return (
      <aside className={styles.sideCard} aria-label="UX 스냅샷">
        <HomeGlassEmptyState label="UX 스냅샷 빈 상태" />
      </aside>
    );
  }
}
