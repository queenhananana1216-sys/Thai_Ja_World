import Link from 'next/link';
import styles from './home-hub.module.css';
import { fetchHomeRealtimeBestPosts } from './home-queries';

export async function HomeRealtimeBest() {
  try {
    const { rows } = await fetchHomeRealtimeBestPosts(5);
    const safeRows = rows ?? [];
    if (safeRows.length === 0) return null;

    return (
      <section className={`${styles.realtimeBest} ${styles.panel}`} aria-label="실시간 인기글">
        <div className={styles.realtimeBestHead}>
          <h2 className={styles.realtimeBestTitle}>🔥 실시간 인기글</h2>
          <Link href="/community/boards" className={styles.panelMore}>
            전체보기
          </Link>
        </div>
        <ul className={styles.realtimeBestList}>
          {(safeRows ?? []).map((post, idx) => (
            <li key={post.id}>
              <Link href={`/community/boards/${post.id}`} className={styles.realtimeBestRow}>
                <span className={styles.realtimeBestRank}>{idx + 1}</span>
                <span className={styles.rowTitle}>{post.title}</span>
                <span className={styles.realtimeBestMeta}>
                  뷰 {post.view_count ?? 0} · 댓 {post.comment_count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  } catch {
    return null;
  }
}
