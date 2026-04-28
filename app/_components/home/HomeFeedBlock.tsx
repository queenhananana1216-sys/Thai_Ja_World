import { fetchHomePersonalizedRecommendations, fetchHomeUnifiedFeed } from './home-queries';
import { HomeFeedClient } from './HomeFeedClient';

export async function HomeFeedBlock() {
  try {
    const { rows, error } = await fetchHomeUnifiedFeed(16, null);
    const { rows: recommendations } = await fetchHomePersonalizedRecommendations(5);
    return (
      <HomeFeedClient
        initialItems={rows}
        initialError={error}
        personalizedRows={recommendations}
      />
    );
  } catch {
    return <HomeFeedClient initialItems={[]} initialError={null} personalizedRows={[]} />;
  }
}
