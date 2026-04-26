import Link from 'next/link';
import { fetchHomeMarket } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';

export async function HomeGridMarket() {
  try {
    const { rows, error } = await fetchHomeMarket(5);
    if (error) return <section className={styles.panel} aria-label="번개장터"><div className={styles.errLine}>{error}</div></section>;

    return (
      <section className={styles.panel} aria-label="번개장터">
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>번개장터</span>
          <Link href="/portal#portal-market" className={styles.panelMore}>
            더보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className={styles.emptyLine}>표시할 거래 글이 없습니다.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map((m) => (
              <li key={m.id}>
                <Link href={`/market/${m.id}`} className={styles.row}>
                  <div className={styles.rowTitle}>{m.title}</div>
                  <div className={styles.rowMeta}>
                    {[m.price_display, m.location, m.status].filter(Boolean).join(' · ')}
                    {' · '}
                    {formatDate(m.created_at)}
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
      <section className={styles.panel} aria-label="번개장터">
        <div className={styles.errLine}>{e instanceof Error ? e.message : '오류'}</div>
      </section>
    );
  }
}
