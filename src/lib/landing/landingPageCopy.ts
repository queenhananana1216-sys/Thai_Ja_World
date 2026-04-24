import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import {
  LANDING_FEATURES,
  LANDING_PAIN_POINTS,
  LANDING_TESTIMONIALS,
} from '@/lib/landing/constants';
import type {
  MergedLandingPageCopy,
  ProblemSectionCopy,
  ServiceSectionCopy,
  TestimonialSectionCopy,
} from '@/lib/landing/landingPageCopyTypes';
import type { PainPoint, LandingFeature, Testimonial } from '@/lib/landing/types';
import { createServerClient } from '@/lib/supabase/server';

const SITE_COPY_KEY = 'home_landing_sections' as const;

type Localized = { ko: string; th: string };

const DEFAULT_PROBLEM: ProblemSectionCopy = {
  title: {
    ko: '이런 상황, 한 번쯤 겪어보셨죠?',
    th: 'เคยเจอสถานการณ์แบบนี้บ้างไหม',
  },
  points: LANDING_PAIN_POINTS,
  footer: {
    ko: '태자월드는 겪은 사람이 정리하고, 다음 사람이 꺼내 쓰는 구조로 이 반복 문제를 줄이기 위해 만들어졌습니다.',
    th: 'แทจาวอลด์ออกแบบมาเพื่อลดปัญหาเดิม ๆ ด้วยข้อมูลที่สะสมและหาใช้ซ้ำได้',
  },
};

const DEFAULT_SERVICE: ServiceSectionCopy = {
  title: {
    ko: '태자월드에서 바로 쓸 수 있는 것들',
    th: 'สิ่งที่ใช้ได้ทันทีใน แทจาวอลด์',
  },
  subtitle: {
    ko: '광장·뉴스·로컬·미니홈 데이터는 실시간에 가깝게 갱신됩니다. 뉴스·꿀팁 수는 콘솔에서 이어집니다.',
    th: 'กระดาน·ข่าว·ร้าน·มินิโฮมอัปเดตใกล้เวลาจริง',
  },
  features: LANDING_FEATURES,
};

const DEFAULT_TESTIMONIAL: TestimonialSectionCopy = {
  title: {
    ko: '실제 교민들이 남긴 이야기',
    th: 'รีวิวจากสมาชิก',
  },
  items: LANDING_TESTIMONIALS,
};

const DEFAULT_FULL: MergedLandingPageCopy = {
  problem: DEFAULT_PROBLEM,
  service: DEFAULT_SERVICE,
  testimonial: DEFAULT_TESTIMONIAL,
  sectionsDegraded: false,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strPair(v: unknown, fallback: Localized): Localized {
  if (!isRecord(v)) return fallback;
  const ko = typeof v.ko === 'string' ? v.ko : fallback.ko;
  const th = typeof v.th === 'string' ? v.th : fallback.th;
  return { ko, th };
}

function parsePainPoints(raw: unknown, fallback: PainPoint[]): PainPoint[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: PainPoint[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    const id = typeof x.id === 'string' ? x.id : '';
    const title = typeof x.title === 'string' ? x.title : '';
    const quote = typeof x.quote === 'string' ? x.quote : '';
    const detail = typeof x.detail === 'string' ? x.detail : '';
    if (id && title) out.push({ id, title, quote, detail });
  }
  return out.length > 0 ? out : fallback;
}

function parseFeatures(raw: unknown, fallback: LandingFeature[]): LandingFeature[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: LandingFeature[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    const id = typeof x.id === 'string' ? x.id : '';
    const title = typeof x.title === 'string' ? x.title : '';
    const description = typeof x.description === 'string' ? x.description : '';
    const icon = typeof x.icon === 'string' ? x.icon : '✨';
    const bullets = Array.isArray(x.bullets)
      ? (x.bullets as unknown[]).filter((b) => typeof b === 'string') as string[]
      : [];
    if (id && title) out.push({ id, title, description, icon, bullets });
  }
  return out.length > 0 ? out : fallback;
}

function parseTestimonials(raw: unknown, fallback: Testimonial[]): Testimonial[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const out: Testimonial[] = [];
  for (const x of raw) {
    if (!isRecord(x)) continue;
    const id = typeof x.id === 'string' ? x.id : '';
    const quote = typeof x.quote === 'string' ? x.quote : '';
    const author = typeof x.author === 'string' ? x.author : '';
    if (id && quote) out.push({ id, quote, author });
  }
  return out.length > 0 ? out : fallback;
}

/**
 * `site_copy.value` 는 JSON 오브젝트. 누락된 필드는 `constants` 기본값으로 채움.
 */
function mergeFromJsonValue(jsonStr: string | null | undefined): MergedLandingPageCopy {
  if (!jsonStr?.trim()) {
    return { ...DEFAULT_FULL, sectionsDegraded: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch {
    return { ...DEFAULT_FULL, sectionsDegraded: true };
  }
  if (!isRecord(parsed)) {
    return { ...DEFAULT_FULL, sectionsDegraded: true };
  }

  const problemRaw = isRecord(parsed.problem) ? parsed.problem : {};
  const serviceRaw = isRecord(parsed.service) ? parsed.service : {};
  const testimonialRaw = isRecord(parsed.testimonial) ? parsed.testimonial : {};

  return {
    problem: {
      title: strPair(problemRaw.title, DEFAULT_PROBLEM.title),
      points: parsePainPoints(problemRaw.points, DEFAULT_PROBLEM.points),
      footer: strPair(problemRaw.footer, DEFAULT_PROBLEM.footer),
    },
    service: {
      title: strPair(serviceRaw.title, DEFAULT_SERVICE.title),
      subtitle: strPair(serviceRaw.subtitle, DEFAULT_SERVICE.subtitle),
      features: parseFeatures(serviceRaw.features, DEFAULT_SERVICE.features),
    },
    testimonial: {
      title: strPair(testimonialRaw.title, DEFAULT_TESTIMONIAL.title),
      items: parseTestimonials(testimonialRaw.items, DEFAULT_TESTIMONIAL.items),
    },
    sectionsDegraded: false,
  };
}

/** 랜딩 Problem·Service·Testimonial 섹션 — DB(`site_copy`) + 코드 기본값 머지 */
export async function fetchMergedLandingPageCopy(): Promise<MergedLandingPageCopy> {
  noStore();
  try {
    const sb = createServerClient();
    const { data, error } = await sb
      .from('site_copy')
      .select('value')
      .eq('key', SITE_COPY_KEY)
      .eq('locale', 'ko')
      .maybeSingle();

    if (error || !data?.value) {
      return { ...DEFAULT_FULL, sectionsDegraded: true };
    }
    return mergeFromJsonValue(data.value as string);
  } catch {
    return { ...DEFAULT_FULL, sectionsDegraded: true };
  }
}

export { SITE_COPY_KEY, DEFAULT_FULL };
export type {
  MergedLandingPageCopy,
  ProblemSectionCopy,
  ServiceSectionCopy,
  TestimonialSectionCopy,
} from '@/lib/landing/landingPageCopyTypes';
