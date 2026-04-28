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
import { createServerClient } from '@/lib/supabase/server';
import EmergencyLifelineWidget from './EmergencyLifelineWidget';

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

function safeExternalUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : null;
}

async function fetchLifelineLinks(): Promise<{ telegram: string | null; line: string | null; whatsapp: string | null }> {
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('site_copy')
      .select('key, value')
      .in('key', ['home_lifeline_telegram_url', 'home_lifeline_line_url', 'home_lifeline_whatsapp_url'])
      .eq('locale', 'ko');
    if (error || !data) {
      return { telegram: null, line: null, whatsapp: null };
    }
    const map = new Map<string, string>(
      data.map((r) => [String(r.key), typeof r.value === 'string' ? r.value : '']),
    );
    return {
      telegram: safeExternalUrl(map.get('home_lifeline_telegram_url') ?? null),
      line: safeExternalUrl(map.get('home_lifeline_line_url') ?? null),
      whatsapp: safeExternalUrl(map.get('home_lifeline_whatsapp_url') ?? null),
    };
  } catch {
    return { telegram: null, line: null, whatsapp: null };
  }
}

export default function HomeCommunityShell() {
  const wingFallback = {
    left: {
      tone: 'mobility',
      badge: 'GRAB',
      detailBadge: 'QR 즉시 호출',
      title: '그랩(Grab)',
      subtitle: '방콕 필수 이동앱',
      cta: 'QR 즉시 호출',
      href: 'https://www.grab.com/th/download/',
      chips: ['방콕', '이동'],
    },
    right: {
      tone: 'delivery',
      badge: '배달K',
      detailBadge: '쿠폰 받기',
      title: '배달K',
      subtitle: '태국 내 한식 야식 1위',
      cta: '쿠폰 받기',
      href: 'https://www.google.com/search?q=%EB%B0%B0%EB%8B%ACK',
      chips: ['한식', '야식'],
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
  const lifelineLinks = await fetchLifelineLinks();
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
    <main className={`${styles.root} min-h-[120vh] pb-20 flex flex-col bg-slate-900`} data-tj-hub="2026">
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
          <EmergencyLifelineWidget />
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
          <section className={styles.lifelineCard} aria-label="태자월드 제보·문의함">
            <h3 className={styles.lifelineTitle}>💡 태자월드 제보·문의함</h3>
            <div className={styles.messengerRow}>
              <a
                href={lifelineLinks.telegram ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.messengerLink} ${styles.telegramGlow} ${!lifelineLinks.telegram ? styles.messengerDisabled : ''}`}
                aria-label="텔레그램 제보"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.04 15.57 8.9 19.5c.4 0 .58-.17.8-.38l1.92-1.84 3.98 2.9c.73.4 1.24.19 1.44-.67l2.62-12.28h.01c.23-1.06-.38-1.48-1.09-1.22L3.2 11.67c-1.05.41-1.03.99-.18 1.25l3.93 1.23L16.08 8c.43-.27.82-.12.5.15"/></svg>
              </a>
              <a
                href={lifelineLinks.whatsapp ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.messengerLink} ${styles.whatsappGlow} ${!lifelineLinks.whatsapp ? styles.messengerDisabled : ''}`}
                aria-label="왓츠앱 제보"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 3.5A11.74 11.74 0 0 0 12.07 0C5.6 0 .31 5.27.3 11.76c0 2.07.54 4.08 1.57 5.85L0 24l6.56-1.86a11.73 11.73 0 0 0 5.5 1.4h.01c6.47 0 11.77-5.27 11.77-11.76 0-3.14-1.22-6.1-3.34-8.28M12.07 21.55h-.01a9.75 9.75 0 0 1-4.97-1.36l-.36-.21-3.89 1.1 1.04-3.79-.23-.39A9.77 9.77 0 0 1 2.3 11.76C2.3 6.37 6.7 1.98 12.08 1.98c2.62 0 5.08 1.02 6.93 2.88a9.72 9.72 0 0 1 2.86 6.9c0 5.4-4.4 9.8-9.8 9.8m5.36-7.33c-.3-.15-1.76-.86-2.03-.96-.27-.1-.46-.15-.66.15s-.76.95-.93 1.15-.34.22-.63.08c-.3-.15-1.24-.45-2.36-1.44a8.72 8.72 0 0 1-1.64-2.03c-.17-.3-.02-.46.13-.6.14-.14.3-.34.44-.5s.2-.3.3-.5a.56.56 0 0 0-.03-.53c-.07-.15-.66-1.59-.9-2.17-.24-.57-.48-.5-.66-.5h-.56c-.2 0-.5.08-.76.37s-1 1-.98 2.43c.02 1.43 1.02 2.8 1.15 2.99.15.2 1.99 3.04 4.83 4.26.67.29 1.2.46 1.6.58.67.2 1.27.17 1.74.1.53-.08 1.76-.72 2.01-1.41.25-.7.25-1.3.17-1.42-.08-.12-.28-.2-.58-.35"/></svg>
              </a>
              <a
                href={lifelineLinks.line ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.messengerLink} ${styles.lineGlow} ${!lifelineLinks.line ? styles.messengerDisabled : ''}`}
                aria-label="라인 제보"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.11 2 1.3 5.84 1.3 10.62c0 4.28 3.82 7.86 8.97 8.52.35.08.83.24.95.56.1.3.07.77.03 1.08l-.16 1c-.05.3-.23 1.17 1.02.64 1.26-.53 6.79-4 9.26-6.86 1.7-1.87 2.53-3.76 2.53-5.94C22.9 5.84 18.09 2 12.2 2zm-4.06 11.9H5.8a.4.4 0 0 1-.4-.4V8.9a.4.4 0 0 1 .8 0v4.2h1.74a.4.4 0 0 1 0 .8m2.06-.4a.4.4 0 0 1-.8 0V8.9a.4.4 0 0 1 .8 0zm4.28.4a.4.4 0 0 1-.33-.17l-2.27-3.1v2.87a.4.4 0 0 1-.8 0V8.9a.4.4 0 0 1 .73-.24l2.28 3.1V8.9a.4.4 0 0 1 .8 0v4.6a.4.4 0 0 1-.4.4m3.92 0h-2.14a.4.4 0 0 1-.4-.4V8.9a.4.4 0 0 1 .4-.4h2.14a.4.4 0 0 1 0 .8h-1.74v1.18h1.74a.4.4 0 0 1 0 .8h-1.74v1.42h1.74a.4.4 0 0 1 0 .8"/></svg>
              </a>
            </div>
          </section>
          <Suspense fallback={<HomeRightStatsSkeleton />}>
            <HomeRightEngagementWing />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
