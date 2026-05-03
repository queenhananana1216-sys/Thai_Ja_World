'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

function normalizeInternalHref(href: string): string | null {
  const h = href.trim();
  if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:'))
    return null;
  try {
    const u = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (typeof window !== 'undefined' && u.origin !== window.location.origin) return null;
    const path = `${u.pathname}${u.search}`;
    return path.length ? path : null;
  } catch {
    return null;
  }
}

/**
 * 포인터 호버 + 스크롤 시 뷰포트 근처의 내부 링크에 대해 `router.prefetch`로 RSC 페이로드를 선당김.
 * Next `<Link prefetch>`와 병행; `prefetch={false}` 링크도 의도가 있으면 미리 받을 수 있음.
 */
export function IntentRoutePrefetch() {
  const router = useRouter();
  const done = useRef(new Set<string>());

  useEffect(() => {
    const prefetch = (rawHref: string) => {
      const path = normalizeInternalHref(rawHref);
      if (!path || done.current.has(path)) return;
      done.current.add(path);
      void router.prefetch(path);
    };

    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!el) return;
      prefetch(el.getAttribute('href') ?? el.href);
    };

    const nearViewportAnchors = () => {
      const margin = 420;
      document.querySelectorAll('a[href^="/"]').forEach((node) => {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        const near = rect.top < window.innerHeight + margin && rect.bottom > -margin;
        if (near) prefetch(el.getAttribute('href') ?? '');
      });
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        nearViewportAnchors();
      });
    };

    document.addEventListener('pointerover', onPointerOver, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    nearViewportAnchors();

    return () => {
      document.removeEventListener('pointerover', onPointerOver, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [router]);

  return null;
}
