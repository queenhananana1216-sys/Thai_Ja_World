'use client';

import Link from 'next/link';
import { useMemo, type CSSProperties } from 'react';
import SiteSearch from '../../../../app/_components/SiteSearch';
import { getDictionary, type Dictionary } from '@/i18n/dictionaries';
import { LANDING_PORTAL_QUICK_HREFS, type LandingPortalQuickHref } from '@/lib/landing/portalQuickHrefs';
import { LANDING_TEXT_NAV_ROW_A, LANDING_TEXT_NAV_ROW_B } from '@/lib/landing/landingTextNavRows';
import { SITE_SEARCH_ENTRIES } from '@/lib/search/siteSearchEntries';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';

type QuickLink = { href: string; label: string; key: LandingPortalQuickHref };

function loginNextHref(path: string): string {
  return `/auth/login?next=${encodeURIComponent(path)}`;
}

const PUBLIC_LANDING_HREFS = new Set(['/', '/tips', '/news']);

function resolveTextNavHref(href: string, isLoggedIn: boolean): string {
  if (href === '/auth/login' || href === '/auth/signup') return href;
  if (PUBLIC_LANDING_HREFS.has(href)) return href;
  return isLoggedIn ? href : loginNextHref(href);
}

/**
 * 랜딩 전용: 필고식 “포털 띠” (슬로건 + 통합검색 + 퀵링크) — 다크 랜딩과 톤 맞춤
 */
export function LandingPortalStrip({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { locale, d } = useClientLocaleDictionary();
  const h: Dictionary['home'] = d.home;

  const quickLinks: QuickLink[] = useMemo(() => {
    return LANDING_PORTAL_QUICK_HREFS.map((href) => {
      const e = SITE_SEARCH_ENTRIES.find((x) => x.href === href);
      if (!e) return null;
      const label = locale === 'th' ? e.thTitle : e.koTitle;
      const target =
        href === '/' || href === '/tips' || href === '/news' ? href : isLoggedIn ? href : loginNextHref(href);
      return { href: target, label, key: href };
    }).filter((x): x is QuickLink => x !== null);
  }, [isLoggedIn, locale]);

  const textNavA = useMemo(() => {
    const out: { href: string; label: string; key: string }[] = [];
    for (const href of LANDING_TEXT_NAV_ROW_A) {
      const e = SITE_SEARCH_ENTRIES.find((x) => x.href === href);
      if (!e) continue;
      out.push({
        href: resolveTextNavHref(href, isLoggedIn),
        label: locale === 'th' ? e.thTitle : e.koTitle,
        key: href,
      });
    }
    return out;
  }, [isLoggedIn, locale]);

  const textNavB = useMemo(() => {
    const out: { href: string; label: string; key: string }[] = [];
    for (const href of LANDING_TEXT_NAV_ROW_B) {
      const e = SITE_SEARCH_ENTRIES.find((x) => x.href === href);
      if (!e) continue;
      out.push({
        href: resolveTextNavHref(href, isLoggedIn),
        label: locale === 'th' ? e.thTitle : e.koTitle,
        key: href,
      });
    }
    return out;
  }, [isLoggedIn, locale]);

  const textLinkStyle: CSSProperties = {
    fontSize: 'clamp(0.7rem, 2.1vw, 0.8rem)',
    fontWeight: 600,
    color: '#c4b5fd',
    textDecoration: 'none',
    lineHeight: 1.5,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid transparent',
  };

  return (
    <section
      className="tj-landing-portal"
      aria-label={h.portalMastTitle}
      style={{
        margin: '0 0 20px',
        padding: '20px 16px 18px',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'linear-gradient(165deg, rgba(20,18,40,0.95) 0%, rgba(12,14,32,0.88) 55%, rgba(24,16,48,0.9) 100%)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <h2
        className="tj-landing-portal__title"
        style={{
          margin: '0 0 6px',
          textAlign: 'center',
          fontSize: 'clamp(1.05rem, 3.2vw, 1.35rem)',
          fontWeight: 800,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}
      >
        {h.portalMastTitle}
      </h2>
      <nav
        aria-label={h.portalTextNavAria}
        style={{
          margin: '0 0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: 10,
            rowGap: 4,
          }}
        >
          {textNavA.map((item) => (
            <Link key={item.key} href={item.href} prefetch={false} style={textLinkStyle}>
              {item.label}
            </Link>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            columnGap: 10,
            rowGap: 4,
          }}
        >
          {textNavB.map((item) => (
            <Link key={item.key} href={item.href} prefetch={false} style={textLinkStyle}>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {h.portalMastSub ? (
        <p
          style={{
            margin: '0 0 14px',
            textAlign: 'center',
            fontSize: '0.86rem',
            lineHeight: 1.5,
            color: '#94a3b8',
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          {h.portalMastSub}
        </p>
      ) : null}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <SiteSearch variant="nate" />
      </div>
      <nav
        className="tj-landing-portal__quick"
        aria-label={h.portalMastQuickAria}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px 10px',
          marginTop: 14,
        }}
      >
        {quickLinks.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            prefetch={false}
            className="tj-landing-portal__pill"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#e2e8f0',
              textDecoration: 'none',
              padding: '7px 12px',
              borderRadius: 999,
              border: '1px solid rgba(196,181,253,0.35)',
              background: 'rgba(255,255,255,0.06)',
              lineHeight: 1.2,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
