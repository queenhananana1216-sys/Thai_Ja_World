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
import { LandingSplineAccent } from '@/components/sections/landing/LandingSplineAccent';
import { ReportBoxSection } from '@/components/sections/landing/ReportBoxSection';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import { getLandingEntryFlow } from '@/lib/landing/entryFlow';
import type { EntryFlowResponse } from '@/lib/landing/types';
import { fetchCommunityPulse, type CommunityPulse } from '@/lib/landing/fetchCommunityPulse';
import { fetchMergedLandingPageCopy } from '@/lib/landing/landingPageCopy';
import { fetchReportBoxPreview } from '@/lib/landing/fetchReportBoxPreview';
import { fetchLandingStatsSSR } from '@/lib/stats/fetchStatsSSR';
import { getLocale } from '@/i18n/get-locale';
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
 * 랜딩 하단 섹션(고민/서비스/리뷰)은 `site_copy` 키 `home_landing_sections` JSON + 코드 기본값.
 *  - 히어로: i18n + `site_copy` (Layout Provider)
 *  - 통계: `fetchLandingStatsSSR`
 *  - Spline 액센트: `resolveSplineScenes()` (배치는 z-index로 본문 아래 유지)
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

  const fallbackPulse: CommunityPulse = {
    columns: [],
    degraded: true,
    generatedAt: new Date().toISOString(),
  };

  const [statsSettled, entryFlowSettled, scenesSettled, pulseSettled, landingCopySettled, reportBoxSettled] =
    await Promise.allSettled([
      fetchLandingStatsSSR(),
      getLandingEntryFlow(),
      resolveSplineScenes(),
      fetchCommunityPulse(locale),
      fetchMergedLandingPageCopy(),
      fetchReportBoxPreview(),
    ]);

  const stats =
    statsSettled.status === 'fulfilled'
      ? statsSettled.value
      : { ...LANDING_DEFAULT_STATS, degraded: true };
  const entryFlow =
    entryFlowSettled.status === 'fulfilled' ? entryFlowSettled.value : fallbackEntryFlow;
  const scenes = scenesSettled.status === 'fulfilled' ? scenesSettled.value : fallbackScenes;
  const pulse = pulseSettled.status === 'fulfilled' ? pulseSettled.value : fallbackPulse;
  const landingCopy = landingCopySettled.status === 'fulfilled' ? landingCopySettled.value : null;
  const reportBox =
    reportBoxSettled.status === 'fulfilled'
      ? reportBoxSettled.value
      : { find: [], missing: [], degraded: true, generatedAt: new Date().toISOString() };

  const heroScene = scenes.hero;
  const heroSceneUrls = [heroScene.sceneCodeUrl, heroScene.publishedUrl].filter(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );

  return (
    <main className="tj-landing-root">
      {/* 랜딩에서만: 좌우 크림 바디·패턴이 비치지 않도록 (전역 body) */}
      <style
        dangerouslySetInnerHTML={{
          __html:
            'body:has(main.tj-landing-root){background-color:#090a1c!important;background-image:none!important;}',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(196,181,253,0.28), transparent 45%), radial-gradient(ellipse at 25% 60%, rgba(249,168,212,0.2), transparent 55%), radial-gradient(ellipse at 85% 70%, rgba(251,191,36,0.14), transparent 60%)',
        }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        <HeroSection
          memberCount={stats.memberCount}
          sceneUrls={heroSceneUrls}
          heroScene={heroScene}
        />
      </div>
      <LandingSplineAccent scene={scenes.accent1} position="top-right" />
      <EntryFlowSection flow={entryFlow} />
      <ReportBoxSection preview={reportBox} locale={locale} />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <CommunityPulseSection pulse={pulse} locale={locale} />
        <HomeBannerGrid locale={locale} />
        <RecentPostsFeed locale={locale} />
      </div>
      <LandingSplineAccent scene={scenes.accent2} position="bottom-left" />
      <ProblemSection
        copy={landingCopy?.problem}
        locale={locale}
        degraded={!landingCopy || landingCopy.sectionsDegraded}
      />
      <ServiceSection
        copy={landingCopy?.service}
        locale={locale}
        degraded={!landingCopy || landingCopy.sectionsDegraded}
      />
      <LandingSplineAccent scene={scenes.accent3} position="top-left" />
      <TestimonialSection
        copy={landingCopy?.testimonial}
        locale={locale}
        degraded={!landingCopy || landingCopy.sectionsDegraded}
      />
      <LandingSplineAccent scene={scenes.accent4} position="bottom-right" />
      <CTASection />
      <FooterSection />
    </main>
  );
}
