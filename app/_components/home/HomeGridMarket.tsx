import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomeMarket, fetchHomeNewsDigest, fetchHomeTipsArticles } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';

type FallbackItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
};

async function buildMarketFallback(limit: number): Promise<FallbackItem[]> {
  const [posts, tips, news] = await Promise.all([
    fetchHomeFeedPosts(limit),
    fetchHomeTipsArticles(limit),
    fetchHomeNewsDigest(limit),
  ]);

  const items: FallbackItem[] = [];
  for (const p of posts.rows) {
    items.push({
      id: `post-${p.id}`,
      href: `/community/boards/${p.id}`,
      title: p.title,
      meta: `생활 정보 · ${formatDate(p.created_at)}`,
    });
  }
  for (const t of tips.rows) {
    items.push({
      id: `tip-${t.id}`,
      href: `/tips/${t.id}`,
      title: t.title,
      meta: `태국 비자/생활 팁 · ${formatDate(t.published_at ?? t.created_at)}`,
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

export async function HomeGridMarket() {
  try {
    const { rows, error } = await fetchHomeMarket(5);
    const useFallback = !!error || rows.length === 0;
    const fallbackRows = useFallback ? await buildMarketFallback(5) : [];

    return (
      <section className={styles.panel} aria-label="번개장터">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>번개장터</span>
          <Link href="/portal#portal-market" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {useFallback ? (
          <ul className={styles.list}>
            {fallbackRows.map((m) => (
              <li key={m.id}>
                <Link href={m.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{m.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>{m.meta}</div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <ul className={styles.list}>
            {rows.map((m) => (
              <li key={m.id}>
                <Link href={`/market/${m.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{m.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>
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
  } catch {
    const fallbackRows = await buildMarketFallback(5);
    return (
      <section className={styles.panel} aria-label="번개장터">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>번개장터</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        <ul className={styles.list}>
          {fallbackRows.map((m) => (
            <li key={m.id}>
              <Link href={m.href} className={styles.row}>
                <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{m.title}</div>
                <div className={`${styles.rowMeta} text-sm md:text-base`}>{m.meta}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }
}
