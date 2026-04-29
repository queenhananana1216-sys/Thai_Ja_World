import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomeJobs, fetchHomeNewsDigest, fetchHomeTipsArticles } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

type FallbackItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
};

async function buildJobsFallback(limit: number): Promise<FallbackItem[]> {
  try {
    const posts = await fetchHomeFeedPosts(limit);
    if ((posts.rows ?? []).length > 0) {
      return (posts.rows ?? []).map((p) => ({
        id: `post-${p.id}`,
        href: `/community/boards/${p.id}`,
        title: p.title,
        meta: `자유게시판 · ${formatDate(p.created_at)}`,
      }));
    }

    const [tips, news] = await Promise.all([fetchHomeTipsArticles(limit), fetchHomeNewsDigest(limit)]);
    const items: FallbackItem[] = [];

    for (const t of tips.rows ?? []) {
      items.push({
        id: `tip-${t.id}`,
        href: `/tips/${t.id}`,
        title: t.title,
        meta: `생활 꿀팁 · ${formatDate(t.published_at ?? t.created_at)}`,
      });
    }
    for (const n of news.rows ?? []) {
      items.push({
        id: `news-${n.id}`,
        href: n.href,
        title: n.title,
        meta: '최신 뉴스',
      });
    }

    return items.slice(0, limit);
  } catch {
    return [];
  }
}

export async function HomeGridJobs() {
  try {
    const { rows, error } = await fetchHomeJobs(5);
    const safeRows = rows ?? [];
    const useFallback = !!error || safeRows.length === 0;
    const fallbackRows = useFallback ? await buildJobsFallback(5) : [];

    return (
      <section className={styles.panel} aria-label="구인구직">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>구인구직</span>
          <Link href="/community/boards?cat=job" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {useFallback ? (
          fallbackRows.length === 0 ? (
            <div className="p-2">
              <HomeGlassEmptyState label="구인구직 빈 상태" />
            </div>
          ) : (
            <ul className={styles.list}>
              {fallbackRows.map((j) => (
                <li key={j.id}>
                  <Link href={j.href} className={styles.row}>
                    <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>
                      <span className={styles.rowTitleWrap}>
                        <span>{j.title}</span>
                        <span className={`${styles.microBadge} ${styles.microBadgeNew}`}>새글</span>
                      </span>
                    </div>
                    <div className={`${styles.rowMeta} text-sm md:text-base`}>{j.meta}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className={styles.list}>
            {safeRows.map((j) => (
              <li key={j.id}>
                <Link href={`/community/boards/${j.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>
                    <span className={styles.rowTitleWrap}>
                      <span>{j.title}</span>
                      <span className={`${styles.microBadge} ${styles.microBadgeHot}`}>HOT</span>
                    </span>
                  </div>
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
          {fallbackRows.length === 0 ? (
            <li className="p-2">
              <HomeGlassEmptyState label="구인구직 빈 상태" />
            </li>
          ) : (
            fallbackRows.map((j) => (
              <li key={j.id}>
                <Link href={j.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>
                    <span className={styles.rowTitleWrap}>
                      <span>{j.title}</span>
                      <span className={`${styles.microBadge} ${styles.microBadgeNew}`}>새글</span>
                    </span>
                  </div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>{j.meta}</div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    );
  }
}
