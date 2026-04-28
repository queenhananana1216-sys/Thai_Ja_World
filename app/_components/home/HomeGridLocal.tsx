import Link from 'next/link';
import { fetchHomeLocalBusinesses } from './home-queries';
import styles from './home-hub.module.css';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

export async function HomeGridLocal() {
  try {
    const { rows, error } = await fetchHomeLocalBusinesses(5);
    if (error) {
      return (
        <section className={styles.panel} aria-label="로컬 업체">
          <div className="p-2">
            <HomeGlassEmptyState label="로컬 업체 빈 상태" />
          </div>
        </section>
      );
    }

    return (
      <section className={styles.panel} aria-label="로컬 업체">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>로컬 업체</span>
          <Link href="/local" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="로컬 업체 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {rows.map((b) => (
              <li key={b.id}>
                <Link href={`/shop/${b.slug}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{b.name}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>
                    {b.category} · {b.region}
                    {b.is_recommended ? ' · 추천' : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  } catch {
    return (
      <section className={styles.panel} aria-label="로컬 업체">
        <div className="p-2">
          <HomeGlassEmptyState label="로컬 업체 빈 상태" />
        </div>
      </section>
    );
  }
}
