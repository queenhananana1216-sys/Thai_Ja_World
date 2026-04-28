import { fetchHomeUnifiedFeed } from './home-queries';
import { HomeFeedClient } from './HomeFeedClient';

export async function HomeFeedBlock() {
  try {
    const { rows, error } = await fetchHomeUnifiedFeed(16, null);
    return <HomeFeedClient initialItems={rows} initialError={error} />;
  } catch {
    return <HomeFeedClient initialItems={[]} initialError={null} />;
  }
}
