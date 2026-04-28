import Link from 'next/link';
import { fetchHomeNewsDigest } from './home-queries';
import styles from './home-hub.module.css';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

function clip(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export async function HomeGridNews() {
  try {
    const { rows, error } = await fetchHomeNewsDigest(5);
    if (error) {
      return (
        <section className={styles.panel} aria-label="오늘의 뉴스">
          <div className="p-2">
            <HomeGlassEmptyState label="오늘의 뉴스 빈 상태" />
          </div>
        </section>
      );
    }

    return (
      <section className={styles.panel} aria-label="오늘의 뉴스">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>오늘의 뉴스</span>
          <Link href="/news" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="오늘의 뉴스 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {rows.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-sm font-semibold text-slate-200`}>
                    <span className={styles.rowTitleWrap}>
                      <span className="min-w-0 line-clamp-1 break-all">{n.title}</span>
                      <span className={`${styles.microBadge} ${styles.microBadgeNew}`}>새글</span>
                    </span>
                  </div>
                  {n.summary ? (
                    <div className={`${styles.rowMeta} text-[11px] text-slate-400 leading-snug line-clamp-2`}>{clip(n.summary, 96)}</div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  } catch {
    return (
      <section className={styles.panel} aria-label="오늘의 뉴스">
        <div className="p-2">
          <HomeGlassEmptyState label="오늘의 뉴스 빈 상태" />
        </div>
      </section>
    );
  }
}
