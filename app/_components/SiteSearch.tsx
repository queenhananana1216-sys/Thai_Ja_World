'use client';

/**
 * 글로벌 헤더·홈 포털 검색 — /api/public/site-search 로 메뉴+뉴스 실시간 조회,
 * 경로·매칭 설명·회원 전용 뱃지 표시. (본문 열람·댓글 정책은 각 페이지·미들웨어)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useClientLocaleDictionary } from '@/i18n/useClientLocaleDictionary';
import { describeSearchMatch } from '@/lib/search/describeSearchMatch';
import { matchSiteSearch } from '@/lib/search/matchSiteSearch';
import { SITE_SEARCH_ENTRIES } from '@/lib/search/siteSearchEntries';
import { sitePathRequiresMemberContent } from '@/lib/search/sitePathAccess';

const QUICK_HREFS = [
  '/',
  '/local',
  '/community/boards',
  '/community/boards?cat=info',
  '/community/trade',
  '/ilchon',
  '/minihome',
] as const;

type ApiPageHit = {
  kind: 'page';
  href: string;
  title: string;
  pathLabel: string;
  matchDetail: string;
  requiresLogin: boolean;
  score: number;
};

type ApiNewsHit = {
  kind: 'news';
  href: string;
  title: string;
  pathLabel: string;
  matchDetail: string;
  requiresLogin: boolean;
  score: number;
};

export type SiteSearchVariant = 'header' | 'hero' | 'portal';

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
  const isPortal = variant === 'portal';
  const isHeroLike = variant === 'hero' || isPortal;

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [apiPages, setApiPages] = useState<ApiPageHit[]>([]);
  const [apiNews, setApiNews] = useState<ApiNewsHit[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiTried, setApiTried] = useState(false);

  const quickList = useMemo(() => {
    return QUICK_HREFS.map((h) => SITE_SEARCH_ENTRIES.find((e) => e.href === h)).filter(
      (e): e is (typeof SITE_SEARCH_ENTRIES)[number] => Boolean(e),
    );
  }, []);

  const fallbackHits = useMemo(() => {
    const t = q.trim();
    if (t.length < 2) return [];
    return matchSiteSearch(SITE_SEARCH_ENTRIES, t, locale, 12);
  }, [q, locale]);

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

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setApiPages([]);
      setApiNews([]);
      setApiLoading(false);
      setApiTried(false);
      return;
    }

    setApiLoading(true);
    setApiTried(false);
    setApiPages([]);
    setApiNews([]);
    const tid = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/public/site-search?q=${encodeURIComponent(t)}&locale=${locale}`,
            { cache: 'no-store' },
          );
          const j = (await res.json()) as { pages?: ApiPageHit[]; news?: ApiNewsHit[] };
          setApiPages(Array.isArray(j.pages) ? j.pages : []);
          setApiNews(Array.isArray(j.news) ? j.news : []);
        } catch {
          setApiPages([]);
          setApiNews([]);
        } finally {
          setApiLoading(false);
          setApiTried(true);
        }
      })();
    }, 280);

    return () => window.clearTimeout(tid);
  }, [q, locale]);

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
    'global-header__search' +
    (isPortal ? ' site-search--hero site-search--portal' : variant === 'hero' ? ' site-search--hero' : ' site-search--header');

  const qTrim = q.trim();
  const showQuick = open && !qTrim;
  const showHits = open && qTrim.length > 0;
  const useApi = qTrim.length >= 2;
  const showEmpty =
    showHits &&
    useApi &&
    apiTried &&
    !apiLoading &&
    apiPages.length === 0 &&
    apiNews.length === 0 &&
    fallbackHits.length === 0;

  function renderApiRow(
    key: string,
    href: string,
    title: string,
    pathLabel: string,
    matchDetail: string,
    requiresLogin: boolean,
  ) {
    return (
      <li key={key} role="option">
        <button type="button" className="global-header__search-hit" onClick={() => go(href)}>
          <span className="global-header__search-hit-title">
            {title}
            <span
              className={
                'tj-search-badge ' +
                (requiresLogin ? 'tj-search-badge--member' : 'tj-search-badge--public')
              }
            >
              {requiresLogin ? s.badgeMember : s.badgePublic}
            </span>
          </span>
          <span className="global-header__search-hit-path">{pathLabel}</span>
          <span className="tj-search-hit-meta">{matchDetail}</span>
        </button>
      </li>
    );
  }

  return (
    <div ref={wrapRef} className={rootClass}>
      {isHeroLike && <p className="site-search__hero-title">{s.heroTitle}</p>}
      {isPortal && <p className="site-search__portal-lead">{s.portalLead}</p>}
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
                      <span className="global-header__search-hit-title">
                        {titleFor(e)}
                        <span
                          className={
                            'tj-search-badge ' +
                            (sitePathRequiresMemberContent(e.href)
                              ? 'tj-search-badge--member'
                              : 'tj-search-badge--public')
                          }
                        >
                          {sitePathRequiresMemberContent(e.href) ? s.badgeMember : s.badgePublic}
                        </span>
                      </span>
                      <span className="global-header__search-hit-path">{hintFor(e)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {showHits && useApi && apiLoading && (
            <p className="global-header__search-loading" role="status">
              {s.searching}
            </p>
          )}

          {showHits && useApi && !apiLoading && (apiPages.length > 0 || apiNews.length > 0) && (
            <>
              {apiPages.length > 0 && (
                <>
                  <div className="global-header__search-section" role="presentation">
                    {s.sectionPages}
                  </div>
                  <ul className="global-header__search-ul">
                    {apiPages.map((p) =>
                      renderApiRow(`p-${p.href}`, p.href, p.title, p.pathLabel, p.matchDetail, p.requiresLogin),
                    )}
                  </ul>
                </>
              )}
              {apiNews.length > 0 && (
                <>
                  <div className="global-header__search-section" role="presentation">
                    {s.sectionNews}
                  </div>
                  <ul className="global-header__search-ul">
                    {apiNews.map((n) =>
                      renderApiRow(`n-${n.href}`, n.href, n.title, n.pathLabel, n.matchDetail, true),
                    )}
                  </ul>
                </>
              )}
            </>
          )}

          {showHits && useApi && apiTried && !apiLoading && apiPages.length === 0 && apiNews.length === 0 && (
            <ul className="global-header__search-ul">
              {fallbackHits.map((h) =>
                renderApiRow(
                  `f-${h.href}`,
                  h.href,
                  locale === 'th' ? h.thTitle : h.koTitle,
                  h.href,
                  describeSearchMatch(h, qTrim, locale),
                  sitePathRequiresMemberContent(h.href),
                ),
              )}
            </ul>
          )}

          {showHits && !useApi && qTrim.length === 1 && (
            <ul className="global-header__search-ul">
              {matchSiteSearch(SITE_SEARCH_ENTRIES, qTrim, locale, 10).map((h) =>
                renderApiRow(
                  `1-${h.href}`,
                  h.href,
                  locale === 'th' ? h.thTitle : h.koTitle,
                  h.href,
                  describeSearchMatch(h, qTrim, locale),
                  sitePathRequiresMemberContent(h.href),
                ),
              )}
            </ul>
          )}

          {showEmpty && <p className="global-header__search-empty">{s.noResults}</p>}

          <div className="global-header__search-footer">
            <Link href="/auth/login" className="global-header__search-footer-link" onClick={close}>
              {locale === 'th' ? 'เข้าสู่ระบบเพื่ออ่านและแสดงความคิดเห็น' : '로그인하고 글·댓글 열기'}
            </Link>
            <Link href="/community/boards" className="global-header__search-footer-link" onClick={close}>
              {locale === 'th' ? 'ดูบอร์ดทั้งหมด' : '광장 전체 보기'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
