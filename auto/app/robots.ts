import type { MetadataRoute } from 'next';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  const base = getAutoSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ''),
  };
}
