import type { Metadata } from 'next';
import { CTASection } from '@/components/sections/landing/CTASection';
import { FooterSection } from '@/components/sections/landing/FooterSection';
import { HeroSection } from '@/components/sections/landing/HeroSection';
import { PortalHomeLayout } from '@/components/landing/PortalHomeLayout';
import { ProblemSection } from '@/components/sections/landing/ProblemSection';
import { ServiceSection } from '@/components/sections/landing/ServiceSection';
import { TestimonialSection } from '@/components/sections/landing/TestimonialSection';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import { getLandingEntryFlow } from '@/lib/landing/entryFlow';
import type { EntryFlowResponse } from '@/lib/landing/types';
import { fetchCommunityPulse, type CommunityPulse } from '@/lib/landing/fetchCommunityPulse';
import { fetchLandingStatsSSR } from '@/lib/stats/fetchStatsSSR';
import { fetchThailandCitiesWeather } from '@/lib/weather/fetchThailandCitiesWeather';
import { fetchUsdFx, FX_SNAPSHOT_FALLBACK } from '@/lib/fx/fetchUsdFx';
import { getLocale } from '@/i18n/get-locale';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

/** 캐시·ISR에 묶이지 않고 배포 직후에도 갱신된 랜딩이 보이게 */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const ui = await loadSiteUiSettings();
  const name = ui.siteDisplayName;
  return {
    title: `${name} — 태국 사는 한국인 커뮤니티 | 비자·생활정보·한인업체`,
    description:
      '태국 거주 한국인을 위한 커뮤니티. 비자 연장, TM30, 병원, 한인 마트 정보부터 AI 뉴스 요약, 환율 계산기, 미니홈피까지. 흘러가는 채팅방이 아닌, 정보가 쌓이는 공간.',
  };
}

/**
 * 랜딩 페이지는 절대 throw 하지 않는다.
 * 서버 호출은 각각 try/catch·`Promise.allSettled` 폴백으로 한 소스만 죽어도 다른 섹션은 렌더.
 * 히어로 배경은 정적 그라디언트만 사용(외부 3D 런타임 없음).
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

  const locale = await getLocale().catch(() => 'ko' as const);

  const fallbackPulse: CommunityPulse = {
    columns: [],
    degraded: true,
    generatedAt: new Date().toISOString(),
  };

  const [statsSettled, entryFlowSettled, pulseSettled, weatherSettled, fxSettled] = await Promise.allSettled([
    fetchLandingStatsSSR(),
    getLandingEntryFlow(),
    fetchCommunityPulse(locale),
    fetchThailandCitiesWeather(locale),
    fetchUsdFx({ next: { revalidate: 1800 } }),
  ]);

  const stats =
    statsSettled.status === 'fulfilled'
      ? statsSettled.value
      : { ...LANDING_DEFAULT_STATS, degraded: true };
  const entryFlow =
    entryFlowSettled.status === 'fulfilled' ? entryFlowSettled.value : fallbackEntryFlow;
  const pulse = pulseSettled.status === 'fulfilled' ? pulseSettled.value : fallbackPulse;
  const weather =
    weatherSettled.status === 'fulfilled'
      ? weatherSettled.value
      : { cities: [], updatedAt: null as string | null };
  const fxSnapshot =
    fxSettled.status === 'fulfilled'
      ? fxSettled.value
      : { ...FX_SNAPSHOT_FALLBACK, dateISO: new Date().toISOString() };

  return (
    <main className="tj-landing-root">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            body:has(main.tj-landing-root){
              background-color:#090a1c!important;
              background-image:none!important;
            }
            body:has(main.tj-landing-root) .fx-mini-layer{ display:none!important; }
          `,
        }}
      />
      <div
        className="relative z-[1] mx-auto w-full max-w-[1320px] px-4 pt-6 pb-4 sm:px-6"
        style={{ minHeight: 0, maxWidth: 1320 }}
      >
        <HeroSection
          memberCount={stats.memberCount}
          portalStats={{
            memberCount: stats.memberCount,
            postCount: stats.postCount,
            newsCount: stats.newsCount,
            spotCount: stats.spotCount,
            lastUpdatedAt: stats.lastUpdatedAt,
            degraded: (stats as { degraded?: boolean }).degraded,
          }}
          variant="portalCompact"
        />
      </div>
      <PortalHomeLayout
        locale={locale}
        pulse={pulse}
        entryFlow={entryFlow}
        stats={stats}
        weatherCities={weather.cities}
        weatherUpdatedAt={weather.updatedAt}
        fx={fxSnapshot}
      />
      <ProblemSection />
      <ServiceSection />
      <TestimonialSection />
      <CTASection />
      <FooterSection />
    </main>
  );
}
