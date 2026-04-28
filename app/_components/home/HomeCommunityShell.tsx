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
import { listPremiumBanners } from '@/lib/banners/listPremiumBanners';

type WingFallback = {
  badge: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
};

function resolveCta(extra: Record<string, unknown>, fallback: string): string {
  const cta = extra.cta;
  return typeof cta === 'string' && cta.trim() ? cta.trim() : fallback;
}

export default function HomeCommunityShell() {
  const wingFallback = {
    left: {
      badge: 'GRAB',
      title: '방콕 이동의 모든 것',
      subtitle: '실시간 픽업 · 기사 매칭 · 교민 안심 호출',
      cta: 'Grab 앱 열기',
      href: 'https://www.grab.com/th/download/',
    },
    right: {
      badge: '배달K',
      title: '파타야 야식 1위',
      subtitle: '한식·분식·치킨 당일 도착',
      cta: '배달K 바로가기',
      href: 'https://www.google.com/search?q=%EB%B0%B0%EB%8B%ACK',
    },
  } satisfies { left: WingFallback; right: WingFallback };

  const bannersPromise = listPremiumBanners({
    placements: ['wing_left', 'wing_right'],
    routeGroups: ['home'],
    limitPerPlacement: 1,
  });

  return (
    <HomeCommunityShellContent
      bannersPromise={bannersPromise}
      wingFallback={wingFallback}
    />
  );
}

async function HomeCommunityShellContent({
  bannersPromise,
  wingFallback,
}: {
  bannersPromise: ReturnType<typeof listPremiumBanners>;
  wingFallback: { left: WingFallback; right: WingFallback };
}) {
  const byPlacement = await bannersPromise;
  const leftDb = byPlacement.wing_left[0] ?? null;
  const rightDb = byPlacement.wing_right[0] ?? null;

  const left = leftDb
    ? {
        badge: leftDb.badgeText ?? wingFallback.left.badge,
        title: leftDb.title || wingFallback.left.title,
        subtitle: leftDb.subtitle || wingFallback.left.subtitle,
        cta: resolveCta(leftDb.extra, wingFallback.left.cta),
        href: leftDb.href || wingFallback.left.href,
      }
    : wingFallback.left;

  const right = rightDb
    ? {
        badge: rightDb.badgeText ?? wingFallback.right.badge,
        title: rightDb.title || wingFallback.right.title,
        subtitle: rightDb.subtitle || wingFallback.right.subtitle,
        cta: resolveCta(rightDb.extra, wingFallback.right.cta),
        href: rightDb.href || wingFallback.right.href,
      }
    : wingFallback.right;

  return (
    <main className={`${styles.root} min-h-screen flex flex-col bg-slate-950`} data-tj-hub="2026">
      <div className={`${styles.hubGrid3} flex-1`}>
        <aside className={`${styles.wingLeft} hidden xl:block`}>
          <div className={styles.localWingStack}>
            <LocalAppBanner
              tone="mobility"
              badge={left.badge}
              title={left.title}
              subtitle={left.subtitle}
              cta={left.cta}
              href={left.href}
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

        <div className={`${styles.wingRight} hidden xl:flex`}>
          <div className={styles.localWingStack}>
            <LocalAppBanner
              tone="delivery"
              badge={right.badge}
              title={right.title}
              subtitle={right.subtitle}
              cta={right.cta}
              href={right.href}
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
