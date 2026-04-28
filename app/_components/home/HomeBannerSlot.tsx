import { fetchHomePortalHeroBanners } from './home-queries';
import { HomeBannerSliderClient } from './HomeBannerSliderClient';
import styles from './home-hub.module.css';

export async function HomeBannerSlot() {
  try {
    const { rows, error } = await fetchHomePortalHeroBanners();
    if (error) return null;
    if (rows.length === 0) return null;
    return <HomeBannerSliderClient banners={rows} />;
  } catch {
    return null;
  }
}
