import { LANDING_FEATURES, LANDING_PAIN_POINTS, LANDING_TESTIMONIALS } from '@/lib/landing/constants';
import type { MergedLandingPageCopy } from '@/lib/landing/landingPageCopyTypes';

/**
 * `site_copy` key `home_landing_sections` (locale ko)에 넣는 JSON 본문의 기본값.
 * 랜딩 서버 머지(`fetchMergedLandingPageCopy`)와 동일한 구조.
 */
export const DEFAULT_LANDING_PAGE_COPY_JSON = {
  problem: {
    title: {
      ko: '이런 상황, 한 번쯤 겪어보셨죠?',
      th: 'เคยเจอสถานการณ์แบบนี้บ้างไหม',
    },
    points: LANDING_PAIN_POINTS,
    footer: {
      ko: '태자월드는 겪은 사람이 정리하고, 다음 사람이 꺼내 쓰는 구조로 이 반복 문제를 줄이기 위해 만들어졌습니다.',
      th: 'แทจาวอลด์ออกแบบมาเพื่อลดปัญหาเดิม ๆ ด้วยข้อมูลที่สะสมและหาใช้ซ้ำได้',
    },
  },
  service: {
    title: {
      ko: '태자월드에서 바로 쓸 수 있는 것들',
      th: 'สิ่งที่ใช้ได้ทันทีใน แทจาวอลด์',
    },
    subtitle: {
      ko: '광장·뉴스·로컬·미니홈 데이터는 실시간에 가깝게 갱신됩니다. 뉴스·꿀팁 수는 콘솔에서 이어집니다.',
      th: 'กระดาน·ข่าว·ร้าน·มินิโฮมอัปเดตใกล้เวลาจริง',
    },
    features: LANDING_FEATURES,
  },
  testimonial: {
    title: {
      ko: '실제 교민들이 남긴 이야기',
      th: 'รีวิวจากสมาชิก',
    },
    items: LANDING_TESTIMONIALS,
  },
} as const;

export const DEFAULT_MERGED_LANDING_PAGE_COPY: MergedLandingPageCopy = {
  problem: {
    title: { ...DEFAULT_LANDING_PAGE_COPY_JSON.problem.title },
    points: [...DEFAULT_LANDING_PAGE_COPY_JSON.problem.points],
    footer: { ...DEFAULT_LANDING_PAGE_COPY_JSON.problem.footer },
  },
  service: {
    title: { ...DEFAULT_LANDING_PAGE_COPY_JSON.service.title },
    subtitle: { ...DEFAULT_LANDING_PAGE_COPY_JSON.service.subtitle },
    features: [...DEFAULT_LANDING_PAGE_COPY_JSON.service.features],
  },
  testimonial: {
    title: { ...DEFAULT_LANDING_PAGE_COPY_JSON.testimonial.title },
    items: [...DEFAULT_LANDING_PAGE_COPY_JSON.testimonial.items],
  },
  sectionsDegraded: false,
};

export function defaultLandingPageCopyJsonString(): string {
  return JSON.stringify(DEFAULT_LANDING_PAGE_COPY_JSON, null, 2);
}
