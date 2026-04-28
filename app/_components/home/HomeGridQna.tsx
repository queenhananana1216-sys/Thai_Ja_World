import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomePostsByCategory } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

export async function HomeGridQna() {
  try {
    const { rows, error } = await fetchHomePostsByCategory('qna', 8);
    const backup = rows.length === 0 ? await fetchHomePostsByCategory('free', 8) : { rows: [], error: null };
    const items =
      rows.length > 0
        ? rows
        : backup.rows.map((r) => ({
            id: r.id,
            title: r.title,
            created_at: r.created_at,
            comment_count: r.comment_count,
            category: 'free',
          }));

    if (error && items.length === 0) {
      return (
        <section className={styles.panel} aria-label="질문답변">
          <div className={styles.panelHead}>
            <span className={`${styles.panelTitle} text-sm md:text-base`}>질문답변</span>
          </div>
          <div className="p-2">
            <HomeGlassEmptyState label="질문답변 빈 상태" />
          </div>
        </section>
      );
    }

    return (
      <section className={styles.panel} aria-label="질문답변">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>질문답변</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="질문답변 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((post) => (
              <li key={post.id}>
                <Link href={`/community/boards/${post.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{post.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>
                    댓글 {post.comment_count} · {formatDate(post.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  } catch {
    const fallback = await fetchHomeFeedPosts(8);
    return (
      <section className={styles.panel} aria-label="질문답변">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>질문답변</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {fallback.rows.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="질문답변 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {fallback.rows.map((post) => (
              <li key={post.id}>
                <Link href={`/community/boards/${post.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{post.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>
                    댓글 {post.comment_count ?? 0} · {formatDate(post.created_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }
}
