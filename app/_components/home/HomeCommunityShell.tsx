import { Suspense } from 'react';
import SiteSearch from '../SiteSearch';
import styles from './home-hub.module.css';
import { HomeMarquee } from './HomeMarquee';
import { HomeBannerSlot } from './HomeBannerSlot';
import { HomeGridFree } from './HomeGridFree';
import { HomeGridQna } from './HomeGridQna';
import { HomeGridLocal } from './HomeGridLocal';
import { HomeGridNews } from './HomeGridNews';
import { HomeRightEngagementWing } from './HomeRightEngagementWing';
import { HomeFeedBlock } from './HomeFeedBlock';
import { HomeLeftRailBanners } from './HomeLeftRailBanners';
import LocalAppBanner from './LocalAppBanner';
import { HomeCompactSkeleton } from './HomeCompactSkeleton';
import { HomeRightStatsSkeleton } from './HomeRightStatsSkeleton';
import { HomeRealtimeBest } from './HomeRealtimeBest';
import { listPremiumBanners } from '@/lib/banners/listPremiumBanners';

type WingFallback = {
  tone: 'mobility' | 'delivery';
  badge: string;
  detailBadge: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  chips: string[];
};

function resolveCta(extra: Record<string, unknown>, fallback: string): string {
  const cta = extra.cta;
  return typeof cta === 'string' && cta.trim() ? cta.trim() : fallback;
}

export default function HomeCommunityShell() {
  const wingFallback = {
    left: {
      tone: 'mobility',
      badge: 'GRAB',
      detailBadge: '★4.9 앱스토어 1위',
      title: '방콕 이동의 모든 것',
      subtitle: '실시간 픽업 · 기사 매칭 · 교민 안심 호출',
      cta: 'Grab 앱 열기',
      href: 'https://www.grab.com/th/download/',
      chips: ['실시간 배차', '공항픽업'],
    },
    right: {
      tone: 'delivery',
      badge: '배달K',
      detailBadge: '오늘의 야식 15% 할인',
      title: '파타야 한식 야식 배달',
      subtitle: '새벽 2시까지 따끈한 한식/치킨 퀵배송',
      cta: '할인 쿠폰 받기',
      href: 'https://www.google.com/search?q=%EB%B0%B0%EB%8B%ACK',
      chips: ['30분 도착', '첫주문 쿠폰'],
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
  let leftDb: (Awaited<ReturnType<typeof listPremiumBanners>>['wing_left'][number] | null) = null;
  let rightDb: (Awaited<ReturnType<typeof listPremiumBanners>>['wing_right'][number] | null) = null;
  try {
    const byPlacement = await bannersPromise;
    leftDb = byPlacement.wing_left[0] ?? null;
    rightDb = byPlacement.wing_right[0] ?? null;
  } catch {
    leftDb = null;
    rightDb = null;
  }

  const left = leftDb
    ? {
        tone: wingFallback.left.tone,
        badge: leftDb.badgeText ?? wingFallback.left.badge,
        detailBadge: wingFallback.left.detailBadge,
        title: leftDb.title || wingFallback.left.title,
        subtitle: leftDb.subtitle || wingFallback.left.subtitle,
        cta: resolveCta(leftDb.extra, wingFallback.left.cta),
        href: leftDb.href || wingFallback.left.href,
        chips: wingFallback.left.chips,
      }
    : wingFallback.left;

  const right = rightDb
    ? {
        tone: wingFallback.right.tone,
        badge: rightDb.badgeText ?? wingFallback.right.badge,
        detailBadge: wingFallback.right.detailBadge,
        title: rightDb.title || wingFallback.right.title,
        subtitle: rightDb.subtitle || wingFallback.right.subtitle,
        cta: resolveCta(rightDb.extra, wingFallback.right.cta),
        href: rightDb.href || wingFallback.right.href,
        chips: wingFallback.right.chips,
      }
    : wingFallback.right;

  const leftWingCards = [
    left,
    {
      tone: 'bolt' as const,
      badge: 'BOLT',
      detailBadge: '신규 30% 쿠폰',
      title: '심야 이동 특화 호출',
      subtitle: '파타야 · 방콕 야간 이동을 빠르게 연결',
      cta: 'Bolt 혜택 보기',
      href: 'https://bolt.eu/en-th/',
      chips: ['심야 특가', '카드 자동결제'],
    },
  ];

  const rightWingCards = [
    right,
    {
      tone: 'lineman' as const,
      badge: 'LINE MAN',
      detailBadge: '배달·마트 통합',
      title: '태국 로컬 배달 올인원',
      subtitle: '식당 배달부터 생필품 장보기까지 한 번에',
      cta: '라인맨 앱 보기',
      href: 'https://lineman.line.me/',
      chips: ['실시간 트래킹', '프로모코드'],
    },
  ];

  return (
    <main className={`${styles.root} min-h-screen flex flex-col bg-slate-950`} data-tj-hub="2026">
      <div className={`${styles.hubGrid3} flex-1`}>
        <aside className={`${styles.wingLeft} hidden xl:block`}>
          <div className={styles.localWingStack}>
            {leftWingCards.map((card) => (
              <LocalAppBanner
                key={`${card.badge}-${card.title}`}
                tone={card.tone}
                badge={card.badge}
                detailBadge={card.detailBadge}
                title={card.title}
                subtitle={card.subtitle}
                cta={card.cta}
                href={card.href}
                chips={card.chips}
              />
            ))}
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

            <Suspense fallback={<HomeCompactSkeleton variant="panel" />}>
              <HomeRealtimeBest />
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
            {rightWingCards.map((card) => (
              <LocalAppBanner
                key={`${card.badge}-${card.title}`}
                tone={card.tone}
                badge={card.badge}
                detailBadge={card.detailBadge}
                title={card.title}
                subtitle={card.subtitle}
                cta={card.cta}
                href={card.href}
                chips={card.chips}
              />
            ))}
          </div>
          <Suspense fallback={<HomeRightStatsSkeleton />}>
            <HomeRightEngagementWing />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
