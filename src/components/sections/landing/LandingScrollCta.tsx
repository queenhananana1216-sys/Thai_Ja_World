'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';

/**
 * 스크롤로 홈 하단에 내려왔을 때 한 번만 — 광장·가입인사 안내 띠
 */
export function LandingScrollCta() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [visible, setVisible] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    setLocale(readLocaleCookie());
  }, []);

  useEffect(() => {
    function onLocaleChange(e: Event) {
      const ce = e as CustomEvent<Locale>;
      if (ce.detail === 'ko' || ce.detail === 'th') setLocale(ce.detail);
    }
    window.addEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(TJ_LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || shown.current) return;
    const el = document.getElementById('tj-landing-scroll-cta-anchor');
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !shown.current) {
            shown.current = true;
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!visible) return null;

  const d = getDictionary(locale);
  const h = d.home;
  const text = h.scrollCta;
  const linkLabel = h.scrollCtaLink;

  return (
    <div
      className="pointer-events-auto fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 px-3 py-3 sm:px-4"
      style={{
        background: 'linear-gradient(180deg, rgba(9,10,28,0.92) 0%, rgba(5,6,18,0.98) 100%)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
      }}
      role="status"
    >
      <p className="mx-auto max-w-3xl text-center text-sm font-medium leading-snug text-slate-100 sm:text-base">
        {text}{' '}
        <Link
          href="/community/boards?cat=intro"
          className="font-bold text-fuchsia-300 underline decoration-fuchsia-400/50 underline-offset-2 hover:text-fuchsia-200"
        >
          {linkLabel}
        </Link>
      </p>
    </div>
  );
}
