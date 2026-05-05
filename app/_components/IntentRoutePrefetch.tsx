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
 * 포인터 호버(짧은 체류 후) + 스크롤 시 뷰포트 근처 링크에 `router.prefetch` — 의도 클릭 직전에 RSC 페이로드를 당김.
 * Next `<Link prefetch>`와 병행.
 */
const HOVER_PREFETCH_MS = 420;

export function IntentRoutePrefetch() {
  const router = useRouter();
  const done = useRef(new Set<string>());
  const hoverTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const prefetch = (rawHref: string) => {
      const path = normalizeInternalHref(rawHref);
      if (!path || done.current.has(path)) return;
      done.current.add(path);
      void router.prefetch(path);
    };

    const clearHover = (rawHref: string) => {
      const path = normalizeInternalHref(rawHref);
      if (!path) return;
      const t = hoverTimers.current.get(path);
      if (t) {
        clearTimeout(t);
        hoverTimers.current.delete(path);
      }
    };

    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!el) return;
      const href = el.getAttribute('href') ?? el.href;
      const path = normalizeInternalHref(href);
      if (!path) return;
      clearHover(href);
      const t = setTimeout(() => {
        hoverTimers.current.delete(path);
        prefetch(href);
      }, HOVER_PREFETCH_MS);
      hoverTimers.current.set(path, t);
    };

    const onPointerOut = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!el) return;
      clearHover(el.getAttribute('href') ?? el.href);
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
    document.addEventListener('pointerout', onPointerOut, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    nearViewportAnchors();

    return () => {
      document.removeEventListener('pointerover', onPointerOver, { capture: true } as AddEventListenerOptions);
      document.removeEventListener('pointerout', onPointerOut, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      hoverTimers.current.forEach((t) => clearTimeout(t));
      hoverTimers.current.clear();
    };
  }, [router]);

  return null;
}
