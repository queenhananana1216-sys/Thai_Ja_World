import type { MetadataRoute } from 'next';
import { getSiteBaseUrl } from '@/lib/seo/site';

/**
 * Control: 크롤러가 들어오면 안 되는 경로 차단.
 * Discovery: sitemap.xml 에서 가치 있는 URL만 나열해 크롤 예산을 허브·콘텐츠에 씁니다.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          /** 양식 페이지 — 색인 가치 낮음, 크롤 예산 절약 */
          '/community/boards/new',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ''),
  };
}
