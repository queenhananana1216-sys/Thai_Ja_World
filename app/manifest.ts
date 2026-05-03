import type { MetadataRoute } from 'next';
import { loadSiteUiSettings } from '@/lib/site-settings/siteUiSettings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const ui = await loadSiteUiSettings();
  const name = ui.siteDisplayName;
  return {
    name,
    short_name: name.slice(0, 12),
    description: `태국에, 살자(Living in Thai) — 태국 생활·교민 참여형 커뮤니티. ${name}`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0f1120',
    theme_color: '#0f1120',
    lang: 'ko',
    categories: ['social', 'news', 'lifestyle'],
    icons: [
      {
        src: '/pwa-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/pwa-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
