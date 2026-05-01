import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '태국에, 살자',
    short_name: '태국살자',
    description: '태국 생활 참여형 커뮤니티 — 태국에, 살자',
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
