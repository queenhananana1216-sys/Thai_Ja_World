'use client';

/**
 * 글로벌 헤더·홈 히어로 — 사이트 경로·게시판 검색 (한글 초성 / 한·태 / 경로)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { matchSiteSearch } from '@/lib/search/matchSiteSearch';
import { SITE_SEARCH_ENTRIES } from '@/lib/search/siteSearchEntries';

const QUICK_HREFS = [
  '/',
  '/local',
  '/community/boards',
  '/community/boards?cat=info',
  '/community/trade',
  '/ilchon',
  '/minihome',
] as const;

export type SiteSearchVariant = 'header' | 'hero';

type SiteSearchProps = {
  variant?: SiteSearchVariant;
};

export default function SiteSearch({ variant = 'header' }: SiteSearchProps) {
  const { locale, d } = useClientLocaleDictionary();
  const s = d.search;
  const router = useRouter();
  const uid = useId().replace(/:/g, '');
  const inputId = `tj-search-${variant}-${uid}`;
  const panelId = `tj-search-panel-${variant}-${uid}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const isHero = variant === 'hero';

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const quickList = useMemo(() => {
    return QUICK_HREFS.map((h) => SITE_SEARCH_ENTRIES.find((e) => e.href === h)).filter(
      (e): e is (typeof SITE_SEARCH_ENTRIES)[number] => Boolean(e),
    );
  }, []);

  const hits = useMemo(() => {
    const t = q.trim();
    if (!t) return [];
    return matchSiteSearch(SITE_SEARCH_ENTRIES, t, locale, 10);
  }, [q, locale]);

  const showQuick = open && !q.trim();
  const showHits = open && q.trim().length > 0;
  const showEmpty = open && q.trim().length > 0 && hits.length === 0;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [close]);

  function go(href: string) {
    close();
    setQ('');
    router.push(href);
  }

  const titleFor = (e: (typeof SITE_SEARCH_ENTRIES)[number]) =>
    locale === 'th' ? e.thTitle : e.koTitle;
  const hintFor = (e: (typeof SITE_SEARCH_ENTRIES)[number]) =>
    locale === 'th' ? e.thHint ?? e.href : e.koHint ?? e.href;

  const rootClass =
    'global-header__search' + (isHero ? ' site-search--hero' : ' site-search--header');

  return (
    <div ref={wrapRef} className={rootClass}>
      {isHero && <p className="site-search__hero-title">{s.heroTitle}</p>}
      <label className="tj-visually-hidden" htmlFor={inputId}>
        {s.ariaLabel}
      </label>
      <div className="global-header__search-field">
        <input
          id={inputId}
          type="search"
          className="global-header__search-input"
          placeholder={s.placeholder}
          autoComplete="off"
          spellCheck={false}
          value={q}
          aria-expanded={open}
          aria-controls={panelId}
          aria-autocomplete="list"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </div>
      <p className="global-header__search-hint" aria-hidden="true">
        {s.hint}
      </p>

      {open && (
        <div id={panelId} className="global-header__search-panel" role="listbox">
          {showQuick && (
            <>
              <div className="global-header__search-section" role="presentation">
                {s.quickHeading}
              </div>
              <ul className="global-header__search-ul">
                {quickList.map((e) => (
                  <li key={e.href} role="option">
                    <button
                      type="button"
                      className="global-header__search-hit"
                      onClick={() => go(e.href)}
                    >
                      <span className="global-header__search-hit-title">{titleFor(e)}</span>
                      <span className="global-header__search-hit-path">{hintFor(e)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showHits && (
            <ul className="global-header__search-ul">
              {hits.map((e) => (
                <li key={e.href} role="option">
                  <button
                    type="button"
                    className="global-header__search-hit"
                    onClick={() => go(e.href)}
                  >
                    <span className="global-header__search-hit-title">{titleFor(e)}</span>
                    <span className="global-header__search-hit-path">{hintFor(e)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showEmpty && <p className="global-header__search-empty">{s.noResults}</p>}

          <div className="global-header__search-footer">
            <Link href="/community/boards" className="global-header__search-footer-link" onClick={close}>
              {locale === 'th' ? 'ดูบอร์ดทั้งหมด' : '광장 전체 보기'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
