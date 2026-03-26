import type { MetadataRoute } from 'next';

function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, '');
  return 'https://thaijaworld.com';
}

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
