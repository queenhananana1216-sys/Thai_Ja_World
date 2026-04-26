import { fetchHomeSiteTotals, fetchHomeUxSnapshot } from './home-queries';
import styles from './home-hub.module.css';

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

function fmtCount(n: number): string {
  return n.toLocaleString('ko-KR');
}

export async function HomeRightUxStats() {
  try {
    const [ux, site] = await Promise.all([fetchHomeUxSnapshot(), fetchHomeSiteTotals()]);

    const { window_start, totals, error: uxErr } = ux;
    const { profileCount, communityItemCount, error: siteErr } = site;

    return (
      <aside className={styles.sideCard} aria-label="사이트 활동 지표">
        <h2 className={styles.sideTitleMain}>바글바글 지표</h2>

        {siteErr ? <p className={styles.siteTotalsHint}>{siteErr}</p> : null}

        {!siteErr ? (
          <div className={styles.siteTotalsGrid} aria-label="전역 누적 통계">
            <div className={styles.siteTotalCell}>
              <div className={styles.siteTotalLabel}>가입 회원</div>
              <div className={styles.siteTotalNum}>{fmtCount(profileCount)}</div>
            </div>
            <div className={styles.siteTotalCell}>
              <div className={styles.siteTotalLabel}>게시·구인·장터</div>
              <div className={styles.siteTotalNumAccent}>{fmtCount(communityItemCount)}</div>
            </div>
          </div>
        ) : (
          <div className={styles.siteTotalsGridMuted} aria-hidden>
            <div className={styles.siteTotalCell}>
              <div className={styles.siteTotalLabel}>가입 회원</div>
              <div className={styles.siteTotalNumPlaceholder}>—</div>
            </div>
            <div className={styles.siteTotalCell}>
              <div className={styles.siteTotalLabel}>게시·구인·장터</div>
              <div className={styles.siteTotalNumPlaceholder}>—</div>
            </div>
          </div>
        )}

        <div className={styles.sideDivider} />

        <h3 className={styles.sideTitle}>실시간 UX (5분)</h3>
        {uxErr ? <p className={styles.errLine}>{uxErr}</p> : null}
        {!totals && !uxErr ? (
          <p className={styles.emptyLine}>UX 집계 행이 아직 없습니다. 봇이 채우면 표시됩니다.</p>
        ) : null}
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
  } catch (e) {
    return (
      <aside className={styles.sideCard} aria-label="사이트 활동 지표">
        <p className={styles.errLine}>{e instanceof Error ? e.message : '오류'}</p>
      </aside>
    );
  }
}
