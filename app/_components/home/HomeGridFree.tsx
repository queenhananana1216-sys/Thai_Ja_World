import Link from 'next/link';
import { fetchHomeFeedPosts, fetchHomePostsByCategory } from './home-queries';
import styles from './home-hub.module.css';
import { formatDate } from '@/lib/utils/formatDate';
import { HomeGlassEmptyState } from './HomeGlassEmptyState';

function isNewPost(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 1000 * 60 * 60 * 24;
}

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
            isHot: (r.comment_count ?? 0) >= 10 || (r.view_count ?? 0) >= 300,
            isNew: isNewPost(r.created_at),
          }))
        : (fallback.rows ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            href: `/community/boards/${r.id}`,
            meta: `댓글 ${r.comment_count ?? 0} · ${formatDate(r.created_at)}`,
            isHot: (r.comment_count ?? 0) >= 10 || (r.view_count ?? 0) >= 300,
            isNew: isNewPost(r.created_at),
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
          <span className={`${styles.panelTitle} min-w-0 truncate text-sm md:text-base`}>자유게시판</span>
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
                  <div className={`${styles.rowTitle} min-w-0 text-sm font-semibold text-slate-200`}>
                    <span className={`${styles.rowTitleWrap} min-w-0`}>
                      <span className="min-w-0 line-clamp-1 break-all">{post.title}</span>
                      {post.isNew ? <span className={`${styles.microBadge} ${styles.microBadgeNew}`}>새글</span> : null}
                      {post.isHot ? <span className={`${styles.microBadge} ${styles.microBadgeHot}`}>HOT</span> : null}
                    </span>
                  </div>
                  <div className={`${styles.rowMeta} min-w-0 truncate text-[11px] text-slate-400 leading-snug`}>{post.meta}</div>
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
        {(fallback.rows ?? []).length === 0 ? (
          <div className="p-2">
            <HomeGlassEmptyState label="자유게시판 빈 상태" />
          </div>
        ) : (
          <ul className={styles.list}>
            {(fallback.rows ?? []).map((post) => (
              <li key={post.id}>
                <Link href={`/community/boards/${post.id}`} className={styles.row}>
                  <div className={`${styles.rowTitle} min-w-0 text-sm font-semibold text-slate-200`}>
                    <span className={`${styles.rowTitleWrap} min-w-0`}>
                      <span className="min-w-0 line-clamp-1 break-all">{post.title}</span>
                      {isNewPost(post.created_at) ? (
                        <span className={`${styles.microBadge} ${styles.microBadgeNew}`}>새글</span>
                      ) : null}
                      {(post.comment_count ?? 0) >= 10 || (post.view_count ?? 0) >= 300 ? (
                        <span className={`${styles.microBadge} ${styles.microBadgeHot}`}>HOT</span>
                      ) : null}
                    </span>
                  </div>
                  <div className={`${styles.rowMeta} min-w-0 truncate text-[11px] text-slate-400 leading-snug`}>
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
