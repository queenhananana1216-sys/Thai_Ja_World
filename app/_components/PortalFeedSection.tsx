import Portal2026View from '../portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
} from '../lib/home/fetchPortalHomeFeed';

/** 홈 SSR 페치 전용 — 부모 `Suspense`가 즉시 폴백을 보여준 뒤 이 컴포넌트가 치환 */
export default async function PortalFeedSection() {
  try {
    const feed = await fetchPortalHomeFeed();
    return <Portal2026View feed={feed} />;
  } catch {
    return <Portal2026View feed={HONEST_EMPTY_PORTAL_HOME_FEED} />;
  }
}
