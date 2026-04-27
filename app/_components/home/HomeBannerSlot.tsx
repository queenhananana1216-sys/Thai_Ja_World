import { fetchHomePortalHeroBanners } from './home-queries';
import { HomeBannerSliderClient } from './HomeBannerSliderClient';
import styles from './home-hub.module.css';

export async function HomeBannerSlot() {
  try {
    const { rows, error } = await fetchHomePortalHeroBanners();
    if (error) {
      return <p className={styles.errLine}>배너: {error}</p>;
    }
    if (rows.length === 0) return null;
    return <HomeBannerSliderClient banners={rows} />;
  } catch (e) {
    return (
      <p className={styles.errLine}>
        배너: {e instanceof Error ? e.message : '오류'}
      </p>
    );
  }
}
