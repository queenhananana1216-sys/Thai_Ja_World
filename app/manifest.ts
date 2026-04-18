import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Thai Ja World',
    short_name: 'Taeja',
    description: '태국 생활 참여형 커뮤니티 태자월드',
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
