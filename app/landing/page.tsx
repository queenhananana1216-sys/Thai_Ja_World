import type { Metadata } from 'next';
import { CTASection } from '@/components/sections/landing/CTASection';
import { EntryFlowSection } from '@/components/sections/landing/EntryFlowSection';
import { FooterSection } from '@/components/sections/landing/FooterSection';
import { HeroSection } from '@/components/sections/landing/HeroSection';
import { ProblemSection } from '@/components/sections/landing/ProblemSection';
import { ServiceSection } from '@/components/sections/landing/ServiceSection';
import { TestimonialSection } from '@/components/sections/landing/TestimonialSection';
import { LANDING_DEFAULT_STATS } from '@/lib/landing/constants';
import { getLandingEntryFlow } from '@/lib/landing/entryFlow';
import type { StatsResponse } from '@/lib/landing/types';

const SPLINE_SCENE_CANDIDATES = [
  'https://my.spline.design/genspl/Wm9vreE2cXA8gSf5DRDnOKgr/',
  'https://my.spline.design/genspl/Zv0JLuq3qSHEAAXrGJoknVqx/',
  'https://my.spline.design/genspl/plOUCcLaDdzgdU55p6Owb8Ra/',
];

export const metadata: Metadata = {
  title: '태자월드 — 태국 사는 한국인 커뮤니티 | 비자·생활정보·한인업체',
  description:
    '태국 거주 한국인을 위한 커뮤니티. 비자 연장, TM30, 병원, 한인 마트 정보부터 AI 뉴스 요약, 환율 계산기, 미니홈피까지. 흘러가는 채팅방이 아닌, 정보가 쌓이는 공간.',
};

function normalizeStats(payload: Partial<StatsResponse> | null): StatsResponse {
  if (!payload) {
    return LANDING_DEFAULT_STATS;
  }

  return {
    postCount: typeof payload.postCount === 'number' ? payload.postCount : 0,
    spotCount: typeof payload.spotCount === 'number' ? payload.spotCount : 0,
    newsCount: typeof payload.newsCount === 'number' ? payload.newsCount : 0,
    memberCount: typeof payload.memberCount === 'number' ? payload.memberCount : 0,
    lastUpdatedAt: typeof payload.lastUpdatedAt === 'string' ? payload.lastUpdatedAt : null,
  };
}

async function getInitialStats(): Promise<StatsResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  try {
    const response = await fetch(`${siteUrl}/api/stats`, { next: { revalidate: 600 } });
    if (!response.ok) {
      return LANDING_DEFAULT_STATS;
    }
    const payload = (await response.json()) as Partial<StatsResponse> | null;
    return normalizeStats(payload);
  } catch {
    return LANDING_DEFAULT_STATS;
  }
}

export default async function LandingPage() {
  const stats = await getInitialStats();
  const entryFlow = await getLandingEntryFlow();
  const splineSceneUrl = process.env.NEXT_PUBLIC_SPLINE_HERO_SCENE_URL;
  const sceneUrls = Array.from(
    new Set(
      [splineSceneUrl, ...SPLINE_SCENE_CANDIDATES]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim())
    )
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
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">
        <HeroSection memberCount={stats.memberCount} sceneUrls={sceneUrls} />
      </div>
      <EntryFlowSection flow={entryFlow} />
      <ProblemSection />
      <ServiceSection />
      <TestimonialSection />
      <CTASection />
      <FooterSection />
    </main>
  );
}
