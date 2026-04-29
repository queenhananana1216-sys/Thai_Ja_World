import { fetchHomePortalHeroBanners } from './home-queries';
import { HomeBannerSliderClient } from './HomeBannerSliderClient';
import styles from './home-hub.module.css';

export async function HomeBannerSlot() {
  try {
    const { rows, error } = await fetchHomePortalHeroBanners();
    if (error) return null;
    const safe = rows ?? [];
    if (safe.length === 0) return null;
    return <HomeBannerSliderClient banners={safe} />;
  } catch {
    return null;
  }
}
