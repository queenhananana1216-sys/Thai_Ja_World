import Link from 'next/link';
import { fetchHomeNewsDigest } from './home-queries';
import styles from './home-hub.module.css';

function clip(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

export async function HomeGridNews() {
  try {
    const { rows, error } = await fetchHomeNewsDigest(5);
    if (error) return <section className={styles.panel} aria-label="오늘의 뉴스"><div className={styles.errLine}>{error}</div></section>;

    return (
      <section className={styles.panel} aria-label="오늘의 뉴스">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>오늘의 뉴스</span>
          <Link href="/news" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {rows.length === 0 ? (
          <ul className={styles.list} aria-label="뉴스 목록" />
        ) : (
          <ul className={styles.list}>
            {rows.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{n.title}</div>
                  {n.summary ? (
                    <div className={`${styles.rowMeta} text-sm md:text-base`}>{clip(n.summary, 96)}</div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  } catch (e) {
    return (
      <section className={styles.panel} aria-label="오늘의 뉴스">
        <div className={styles.errLine}>{e instanceof Error ? e.message : '오류'}</div>
      </section>
    );
  }
}
