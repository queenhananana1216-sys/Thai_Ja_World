import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomeJobs, fetchHomeNewsDigest, fetchHomeTipsArticles } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';

type FallbackItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
};

async function buildJobsFallback(limit: number): Promise<FallbackItem[]> {
  const [tips, posts, news] = await Promise.all([
    fetchHomeTipsArticles(limit),
    fetchHomeFeedPosts(limit),
    fetchHomeNewsDigest(limit),
  ]);

  const items: FallbackItem[] = [];

  for (const t of tips.rows) {
    items.push({
      id: `tip-${t.id}`,
      href: `/tips/${t.id}`,
      title: t.title,
      meta: `생활 꿀팁 · ${formatDate(t.published_at ?? t.created_at)}`,
    });
  }
  for (const p of posts.rows) {
    items.push({
      id: `post-${p.id}`,
      href: `/community/boards/${p.id}`,
      title: p.title,
      meta: `자유게시판 · ${formatDate(p.created_at)}`,
    });
  }
  for (const n of news.rows) {
    items.push({
      id: `news-${n.id}`,
      href: n.href,
      title: n.title,
      meta: '최신 뉴스',
    });
  }

  return items.slice(0, limit);
}

export async function HomeGridJobs() {
  try {
    const { rows, error } = await fetchHomeJobs(5);
    const useFallback = !!error || rows.length === 0;
    const fallbackRows = useFallback ? await buildJobsFallback(5) : [];

    return (
      <section className={styles.panel} aria-label="구인구직">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>구인구직</span>
          <Link href="/portal#portal-jobs" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {useFallback ? (
          <ul className={styles.list}>
            {fallbackRows.map((j) => (
              <li key={j.id}>
                <Link href={j.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{j.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>{j.meta}</div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.list}>
            {rows.map((j) => (
              <li key={j.id}>
                <Link href={`/jobs/${j.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{j.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>
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
  } catch {
    const fallbackRows = await buildJobsFallback(5);
    return (
      <section className={styles.panel} aria-label="구인구직">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>구인구직</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        <ul className={styles.list}>
          {fallbackRows.map((j) => (
            <li key={j.id}>
              <Link href={j.href} className={styles.row}>
                <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{j.title}</div>
                <div className={`${styles.rowMeta} text-sm md:text-base`}>{j.meta}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}
