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
                  <div className={`${styles.rowTitle} text-sm font-semibold text-slate-200`}>
                    <span className={styles.rowTitleWrap}>
                      <span className="min-w-0 line-clamp-1 break-all">{b.name}</span>
                      {b.is_recommended ? <span className={`${styles.microBadge} ${styles.microBadgeHot}`}>HOT</span> : null}
                    </span>
                  </div>
                  <div className={`${styles.rowMeta} text-[11px] text-slate-400 leading-snug`}>
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
