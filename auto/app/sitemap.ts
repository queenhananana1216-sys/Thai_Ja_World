import type { MetadataRoute } from 'next';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAutoSiteBaseUrl();
  const now = new Date();
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
