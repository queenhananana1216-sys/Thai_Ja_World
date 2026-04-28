import { Suspense } from 'react';
import SiteSearch from '../SiteSearch';
import styles from './home-hub.module.css';
import { HomeMarquee } from './HomeMarquee';
import { HomeBannerSlot } from './HomeBannerSlot';
import { HomeGridFree } from './HomeGridFree';
import { HomeGridQna } from './HomeGridQna';
import { HomeGridLocal } from './HomeGridLocal';
import { HomeGridNews } from './HomeGridNews';
import { HomeRightDbStats } from './HomeRightDbStats';
import { HomeRightUxStats } from './HomeRightUxStats';
import { HomeRightFxBlock } from './HomeRightFxBlock';
import { HomeFeedBlock } from './HomeFeedBlock';
import { HomeLeftRailBanners } from './HomeLeftRailBanners';
import LocalAppBanner from './LocalAppBanner';
import { HomeCompactSkeleton } from './HomeCompactSkeleton';
import { HomeRightStatsSkeleton } from './HomeRightStatsSkeleton';

export default function HomeCommunityShell() {
  return (
    <main className={`${styles.root} min-h-screen flex flex-col bg-slate-950`} data-tj-hub="2026">
      <div className={`${styles.hubGrid3} flex-1`}>
        <aside className={styles.wingLeft}>
          <div className={styles.localWingStack}>
            <LocalAppBanner
              tone="mobility"
              badge="T-RIDE"
              title="방콕 이동의 모든 것"
              subtitle="실시간 픽업 · 기사 매칭 · 교민 안심 호출"
              cta="QR 다운로드"
            />
          </div>
          <Suspense fallback={<HomeCompactSkeleton variant="left" />}>
            <HomeLeftRailBanners />
          </Suspense>
        </aside>

        <div className={styles.centerStack}>
          <div className={styles.tightDataColumn}>
            <div className={styles.hubSearchStrip}>
              <p className={`${styles.hubSlogan} text-xs md:text-sm`}>
                태국 생활의 모든 것, 태자월드
              </p>
              <div className={styles.hubSearchGrow}>
                <SiteSearch variant="integratedHub" />
              </div>
            </div>

            <Suspense fallback={<HomeCompactSkeleton variant="marquee" />}>
              <HomeMarquee />
            </Suspense>

            <Suspense fallback={<HomeCompactSkeleton variant="slider" />}>
              <HomeBannerSlot />
            </Suspense>

            <div className={styles.philgoDense}>
              <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
                <HomeGridFree />
              </Suspense>
              <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
                <HomeGridQna />
              </Suspense>
              <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
                <HomeGridLocal />
              </Suspense>
              <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
                <HomeGridNews />
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<HomeCompactSkeleton variant="feed" />}>
            <HomeFeedBlock />
          </Suspense>
        </div>

        <div className={styles.wingRight}>
          <div className={styles.localWingStack}>
            <LocalAppBanner
              tone="delivery"
              badge="K-배달"
              title="파타야 야식 1위"
              subtitle="한식·분식·치킨 당일 도착"
              cta="할인 쿠폰 받기"
            />
          </div>
          <Suspense fallback={<HomeRightStatsSkeleton />}>
            <HomeRightDbStats />
          </Suspense>
          <Suspense fallback={<HomeCompactSkeleton variant="fx" />}>
            <HomeRightFxBlock />
          </Suspense>
          <Suspense fallback={<HomeRightStatsSkeleton />}>
            <HomeRightUxStats />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
