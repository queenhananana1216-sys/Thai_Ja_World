import type { Metadata } from 'next';
import { CTASection } from '@/components/sections/landing/CTASection';
import { CommunityPulseSection } from '@/components/sections/landing/CommunityPulseSection';
import { EntryFlowSection } from '@/components/sections/landing/EntryFlowSection';
import { HomeBannerGrid } from '@/components/sections/landing/HomeBannerGrid';
import { RecentPostsFeed } from '@/components/sections/landing/RecentPostsFeed';
import { FooterSection } from '@/components/sections/landing/FooterSection';
import { HeroSection } from '@/components/sections/landing/HeroSection';
import { ProblemSection } from '@/components/sections/landing/ProblemSection';
import { ServiceSection } from '@/components/sections/landing/ServiceSection';
import { TestimonialSection } from '@/components/sections/landing/TestimonialSection';
import { PortalHomeShell } from '@/components/sections/landing/PortalHomeShell';
import { WidgetGrid } from '@/components/sections/landing/WidgetGrid';
import { PortalNewsTeaser } from '@/components/sections/landing/PortalNewsTeaser';
import { PortalStatsWidget } from '@/components/sections/landing/PortalStatsWidget';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import { getLandingEntryFlow } from '@/lib/landing/entryFlow';
import type { EntryFlowResponse } from '@/lib/landing/types';
import { fetchCommunityPulse, type CommunityPulse } from '@/lib/landing/fetchCommunityPulse';
import { fetchNewsTeaserForHome, type NewsTeaserItem } from '@/lib/landing/fetchNewsTeaser';
import { fetchLandingStatsSSR } from '@/lib/stats/fetchStatsSSR';
import { getLocale } from '@/i18n/get-locale';
import { getDictionary } from '@/i18n/dictionaries';
import { resolveSplineScenes } from '@/lib/spline/resolver';
import type { SplineScenesBySlot } from '@/lib/spline/types';

export const metadata: Metadata = {
  title: '태자월드 — 태국 사는 한국인 커뮤니티 | 비자·생활정보·한인업체',
  description:
    '태국 거주 한국인을 위한 커뮤니티. 비자 연장, TM30, 병원, 한인 마트 정보부터 AI 뉴스 요약, 환율 계산기, 미니홈피까지. 흘러가는 채팅방이 아닌, 정보가 쌓이는 공간.',
};

/**
 * 랜딩 페이지는 절대 throw 하지 않는다.
 * 서버 호출(stats·entry flow·spline 장면)은 각각 자체 try/catch 폴백을 가지며,
 * 이 SSR 함수에서 한 번 더 `Promise.allSettled` 로 감싸 한 소스만 죽어도 다른 섹션은 렌더.
 *
 * - 카피: i18n `getDictionary` + (향후) site_copy와 동일 키
 * - 통계: `fetchLandingStatsSSR`
 * - 뉴스 티저: `fetchNewsTeaserForHome` (news 허브와 동일 processed_news 파이프)
 */
export default async function LandingPage() {
  const fallbackEntryFlow: EntryFlowResponse = {
    generatedAt: new Date().toISOString(),
    lanes: [],
    snapshot: {
      posts7d: 0,
      flea7d: 0,
      job7d: 0,
      publishedShops: 0,
      deliveryReadyShops: 0,
      minihomePublicRooms: 0,
      news3d: 0,
      tradeClicks14d: 0,
      jobClicks14d: 0,
      localClicks14d: 0,
      minihomeClicks14d: 0,
      tradeConversions14d: 0,
      jobConversions14d: 0,
      localConversions14d: 0,
      minihomeConversions14d: 0,
    },
  };

  const fallbackScenes: SplineScenesBySlot = {
    logo: {
      slot: 'logo',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'high',
      placementHint: null,
    },
    hero: {
      slot: 'hero',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'high',
      placementHint: null,
    },
    accent1: {
      slot: 'accent1',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'medium',
      placementHint: null,
    },
    accent2: {
      slot: 'accent2',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'medium',
      placementHint: null,
    },
    accent3: {
      slot: 'accent3',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'medium',
      placementHint: null,
    },
    accent4: {
      slot: 'accent4',
      sourceFileId: null,
      publishedUrl: null,
      sceneCodeUrl: null,
      isEnabled: true,
      qualityTier: 'medium',
      placementHint: null,
    },
  };

  const locale = await getLocale().catch(() => 'ko' as const);
  const dictionary = getDictionary(locale);

  const fallbackPulse: CommunityPulse = {
    columns: [],
    degraded: true,
    generatedAt: new Date().toISOString(),
  };

  const [statsSettled, entryFlowSettled, scenesSettled, pulseSettled, newsSettled] =
    await Promise.allSettled([
      fetchLandingStatsSSR(),
      getLandingEntryFlow(),
      resolveSplineScenes(),
      fetchCommunityPulse(locale),
      fetchNewsTeaserForHome(locale),
    ]);

  const stats =
    statsSettled.status === 'fulfilled'
      ? statsSettled.value
      : { ...LANDING_DEFAULT_STATS, degraded: true };
  const entryFlow =
    entryFlowSettled.status === 'fulfilled' ? entryFlowSettled.value : fallbackEntryFlow;
  const scenes = scenesSettled.status === 'fulfilled' ? scenesSettled.value : fallbackScenes;
  const pulse = pulseSettled.status === 'fulfilled' ? pulseSettled.value : fallbackPulse;
  const newsTeaser: NewsTeaserItem[] =
    newsSettled.status === 'fulfilled' ? newsSettled.value : [];

  const heroScene = scenes.hero;
  const heroSceneUrls = [heroScene.sceneCodeUrl, heroScene.publishedUrl].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );

  return (
    <PortalHomeShell
      hero={
        <HeroSection
          memberCount={stats.memberCount}
          sceneUrls={heroSceneUrls}
          heroScene={heroScene}
          variant="portal"
        />
      }
    >
      <div className="mt-1 space-y-4 sm:mt-2 sm:space-y-5" data-landing="portal-3col">
        <WidgetGrid
          left={
            <>
              <PortalStatsWidget
                locale={locale}
                d={dictionary}
                memberCount={stats.memberCount}
                postCount={stats.postCount}
                newsCount={stats.newsCount}
                spotCount={stats.spotCount}
                lastUpdatedAt={stats.lastUpdatedAt}
                degraded={stats.degraded}
              />
              <HomeBannerGrid locale={locale} variant="light" dictionary={dictionary} />
            </>
          }
          main={
            <>
              {pulse.columns.some((c) => c.items.length > 0) ? (
                <CommunityPulseSection pulse={pulse} locale={locale} variant="light" />
              ) : null}
              <RecentPostsFeed locale={locale} variant="light" dictionary={dictionary} />
              <EntryFlowSection
                flow={entryFlow}
                variant="portal"
                portalHead={{
                  kicker: dictionary.home.entryFlowKicker,
                  title: dictionary.home.entryFlowTitle,
                  sub: dictionary.home.entryFlowSub,
                }}
              />
            </>
          }
          right={<PortalNewsTeaser locale={locale} d={dictionary} items={newsTeaser} />}
        />
        <ServiceSection
          variant="portal"
          serviceHub={{
            title: dictionary.home.serviceHubTitle,
            sub: dictionary.home.serviceHubSub,
          }}
        />
        <ProblemSection variant="portal" />
        <TestimonialSection variant="portal" />
        <CTASection variant="portal" />
        <FooterSection variant="portal" />
      </div>
    </PortalHomeShell>
  );
}
