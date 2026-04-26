import { fetchHomeUnifiedFeed } from './home-queries';
import { HomeFeedClient } from './HomeFeedClient';
import styles from './home-hub.module.css';

export async function HomeFeedBlock() {
  try {
    const { rows, error } = await fetchHomeUnifiedFeed(16, null);
    return <HomeFeedClient initialItems={rows} initialError={error} />;
  } catch (e) {
    return (
      <section className={styles.feed}>
        <p className={styles.errLine}>{e instanceof Error ? e.message : '피드 오류'}</p>
        <HomeFeedClient initialItems={[]} initialError={null} />
      </section>
    );
  }
}
