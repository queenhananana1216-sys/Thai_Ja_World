import { Suspense } from 'react';
import SiteSearch from '../SiteSearch';
import styles from './home-hub.module.css';
import { HomeMarquee } from './HomeMarquee';
import { HomeBannerSlot } from './HomeBannerSlot';
import { HomeGridJobs } from './HomeGridJobs';
import { HomeGridMarket } from './HomeGridMarket';
import { HomeGridLocal } from './HomeGridLocal';
import { HomeGridNews } from './HomeGridNews';
import { HomeRightDbStats } from './HomeRightDbStats';
import { HomeRightUxStats } from './HomeRightUxStats';
import { HomeRightFxBlock } from './HomeRightFxBlock';
import { HomeFeedBlock } from './HomeFeedBlock';
import { HomeLeftRailBanners } from './HomeLeftRailBanners';
import { HomeCompactSkeleton } from './HomeCompactSkeleton';
import { HomeRightStatsSkeleton } from './HomeRightStatsSkeleton';

export default function HomeCommunityShell() {
  return (
    <main className={styles.root} data-tj-hub="2026">
      <div className={styles.hubGrid3}>
        <aside className={styles.wingLeft}>
          <Suspense fallback={<HomeCompactSkeleton variant="left" />}>
            <HomeLeftRailBanners />
          </Suspense>
        </aside>

        <div className={styles.centerStack}>
          <div className={styles.tightDataColumn}>
            <div className={styles.hubSearchStrip}>
              <p className={styles.hubSlogan}>태국 생활의 모든 연결, 태자월드</p>
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
                <HomeGridJobs />
              </Suspense>
              <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
                <HomeGridMarket />
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
