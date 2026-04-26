import Link from 'next/link';
import { fetchHomeJobs } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';

export async function HomeGridJobs() {
  try {
    const { rows, error } = await fetchHomeJobs(5);
    if (error) return <section className={styles.panel} aria-label="구인구직"><div className={styles.errLine}>{error}</div></section>;

    return (
      <section className={styles.panel} aria-label="구인구직">
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>구인구직</span>
          <Link href="/portal#portal-jobs" className={styles.panelMore}>
            더보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className={styles.emptyLine}>표시할 구인 글이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className={styles.row}>
                  <div className={styles.rowTitle}>{j.title}</div>
                  <div className={styles.rowMeta}>
                    {[j.company_name, j.location, j.salary].filter(Boolean).join(' · ') || ' '}
                    {' · '}
                    {formatDate(j.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  } catch (e) {
    return (
      <section className={styles.panel} aria-label="구인구직">
        <div className={styles.errLine}>{e instanceof Error ? e.message : '오류'}</div>
      </section>
    );
  }
}
