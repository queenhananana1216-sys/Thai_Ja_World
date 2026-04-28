import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomePostsByCategory } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

export async function HomeGridFree() {
  try {
    const { rows, error } = await fetchHomePostsByCategory('free', 8);
    const fallback = rows.length === 0 ? await fetchHomeFeedPosts(8) : { rows: [], error: null };
    const items =
      rows.length > 0
        ? rows.map((r) => ({
            id: r.id,
            title: r.title,
            href: `/community/boards/${r.id}`,
            meta: `댓글 ${r.comment_count} · ${formatDate(r.created_at)}`,
          }))
        : (fallback.rows ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            href: `/community/boards/${r.id}`,
            meta: `댓글 ${r.comment_count ?? 0} · ${formatDate(r.created_at)}`,
          }));

    if (error && items.length === 0) {
      return (
        <section className={styles.panel} aria-label="자유게시판">
          <div className={styles.panelHead}>
            <span className={`${styles.panelTitle} text-sm md:text-base`}>자유게시판</span>
          </div>
          <div className="p-2">
            <HomeGlassEmptyState label="자유게시판 빈 상태" />
          </div>
        </section>
      );
    }

    return (
      <section className={styles.panel} aria-label="자유게시판">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>자유게시판</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="자유게시판 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {items.map((post) => (
              <li key={post.id}>
                <Link href={post.href} className={styles.row}>
                  <div className={`${styles.rowTitle} text-base md:text-lg leading-snug`}>{post.title}</div>
                  <div className={`${styles.rowMeta} text-sm md:text-base`}>{post.meta}</div>
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
      <section className={styles.panel} aria-label="자유게시판">
        <div className={styles.panelHead}>
          <span className={`${styles.panelTitle} text-sm md:text-base`}>자유게시판</span>
          <Link href="/community/boards" className={`${styles.panelMore} text-sm`}>
            더보기
          </Link>
        </div>
        {fallback.rows.length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="자유게시판 빈 상태" />
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
