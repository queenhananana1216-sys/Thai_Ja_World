'use client';

/**
 * 홈 본문 — Supabase·뉴스·가게는 브라우저에서만 조회해 첫 HTML이 즉시 끝나게 함.
 */
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BrandPhrase } from './BrandPhrase';
import { HubTipSocialIcons } from './HubTipSocialIcons';
import SiteSearch from './SiteSearch';
import { useHeroSiteCopy } from '@/contexts/HeroSiteCopyContext';
import { getDictionary } from '@/i18n/dictionaries';
import { readLocaleCookie } from '@/i18n/readLocaleCookie';
import { TJ_LOCALE_CHANGE_EVENT, type Locale } from '@/i18n/types';
import type { NewsItem, LocalBusiness } from '@/types/taeworld';
import { titleAndSummaryFromProcessed } from '@/lib/news/processedNewsDisplay';
import { createBrowserClient } from '@/lib/supabase/client';
import { formatDate, extractHostname } from '@/lib/utils/formatDate';
import { SITE_SEARCH_ENTRIES } from '@/lib/search/siteSearchEntries';

const HOME_FETCH_BUDGET_MS = 12_000;

const PORTAL_QUICK_HREFS = [
  '/',
  '/tips',
  '/local',
  '/community/boards',
  '/community/boards?cat=info',
  '/community/trade',
  '/chat',
  '/notifications',
  '/ilchon',
  '/minihome',
] as const;

type PortalQuickHref = (typeof PORTAL_QUICK_HREFS)[number];
type PortalQuickLink = { href: string; label: string; key: PortalQuickHref };

function loginNextHref(path: string): string {
  return `/auth/login?next=${encodeURIComponent(path)}`;
}

type WeatherRow = { key: string; label: string; temp: number | null; condition: string };

function tipEnv() {
  return {
    tg: process.env.NEXT_PUBLIC_TIP_TELEGRAM_URL?.trim(),
    wa: process.env.NEXT_PUBLIC_TIP_WHATSAPP_URL?.trim(),
    line: process.env.NEXT_PUBLIC_TIP_LINE_URL?.trim(),
    fb: process.env.NEXT_PUBLIC_TIP_FACEBOOK_URL?.trim(),
    tt: process.env.NEXT_PUBLIC_TIP_TIKTOK_URL?.trim(),
  };
}

async function fetchNewsBrowser(): Promise<NewsItem[]> {
  const sb = createBrowserClient();
  try {
    /** 승인된 processed_news 만 — raw_news 폴백 없음(미승인 원문 노출 방지) */
    const { data: processed } = await sb
      .from('processed_news')
      .select(
        'id, clean_body, raw_news(title, external_url, published_at), summaries(summary_text, model)',
      )
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(15);

    return (processed ?? []).map((pn) => {
      const rn = (pn.raw_news as unknown) as {
        title: string;
        external_url: string;
        published_at: string | null;
      } | null;
      const sums = (pn.summaries as unknown) as
        | { summary_text: string; model: string | null }[]
        | null;
      const localeSource = {
        clean_body: (pn.clean_body as string | null) ?? null,
        raw_title: rn?.title ?? null,
        summaries: sums ?? null,
      };
      const { title, summary_text } = titleAndSummaryFromProcessed(
        localeSource.clean_body,
        localeSource.raw_title,
        localeSource.summaries,
        'ko',
      );
      return {
        id: String(pn.id),
        title,
        external_url: rn?.external_url ?? '#',
        published_at: rn?.published_at ?? null,
        summary_text,
        internalNewsId: String(pn.id),
        localeSource,
      };
    });
  } catch {
    return [];
  }
}

async function fetchFeaturedShopsBrowser(): Promise<LocalBusiness[]> {
  const sb = createBrowserClient();
  try {
    const { data } = await sb
      .from('local_businesses')
      .select(
        'id, slug, name, category, region, description, image_url, emoji, tier, is_recommended, has_discount, discount, tags',
      )
      .eq('is_active', true)
      .order('is_recommended', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(4);

    const TIER_RANK: Record<string, number> = { premium: 0, standard: 1, basic: 2 };
    return (data ?? [])
      .map((b) => b as unknown as LocalBusiness)
      .sort((a, b) => (TIER_RANK[a.tier] ?? 2) - (TIER_RANK[b.tier] ?? 2));
  } catch {
    return [];
  }
}

function NewsCardCompact({ item }: { item: NewsItem }) {
  const host = extractHostname(item.external_url);
  const date = formatDate(item.published_at);
  const titleClass = 'news-card__title';
  const titleNode = item.internalNewsId ? (
    <Link href={`/news/${item.internalNewsId}`} className={titleClass}>
      {item.title}
    </Link>
  ) : (
    <a
      href={item.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className={titleClass}
    >
      {item.title}
    </a>
  );
  const dek = item.summary_text?.trim();
  return (
    <article className="news-card">
      {titleNode}
      {dek ? <p className="news-card__summary">{dek}</p> : null}
      <div className="news-card__meta">
        {host && <span>🔗 {host}</span>}
        {date && <span>🕐 {date}</span>}
      </div>
    </article>
  );
}

function ShopMiniCard({
  shop,
  tierPremium,
  tierStandard,
}: {
  shop: LocalBusiness;
  tierPremium: string;
  tierStandard: string;
}) {
  return (
    <Link href={`/local/${shop.slug}`} className="shop-card">
      <div
        className="shop-card__image"
        style={
          shop.image_url
            ? {
                backgroundImage: `url(${shop.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}
        }
      >
        {!shop.image_url && shop.emoji}
      </div>
      <div className="shop-card__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span className="shop-card__name">{shop.name}</span>
          {shop.tier !== 'basic' && (
            <span className={`badge badge-${shop.tier}`}>
              {shop.tier === 'premium' ? tierPremium : tierStandard}
            </span>
          )}
        </div>
        <span className="shop-card__category">
          {shop.category} · {shop.region}
        </span>
      </div>
    </Link>
  );
}

export default function HomePageClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [locale, setLocale] = useState<Locale>('ko');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [shops, setShops] = useState<LocalBusiness[]>([]);
  /** 뉴스·가게 fetch 진행 중 (히어로·타일은 바로 표시) */
  const [listsBusy, setListsBusy] = useState(true);
  const [weatherRows, setWeatherRows] = useState<WeatherRow[]>([]);
  const [weatherBusy, setWeatherBusy] = useState(true);
  const [weatherErr, setWeatherErr] = useState(false);

  useLayoutEffect(() => {
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

  const d = useMemo(() => getDictionary(locale), [locale]);
  const h = d.home;
  const heroSite = useHeroSiteCopy();
  const heroTitle = locale === 'th' ? heroSite.titleTh : heroSite.titleKo;
  const heroTag = locale === 'th' ? heroSite.tagTh : heroSite.tagKo;
  const heroKicker = locale === 'th' ? heroSite.heroKickerTh : heroSite.heroKickerKo;
  const heroLeadLine = locale === 'th' ? heroSite.heroLeadTh : heroSite.heroLeadKo;
  const heroSubBlock = locale === 'th' ? heroSite.heroSubTh : heroSite.heroSubKo;
  const hotLabelUi = locale === 'th' ? heroSite.hotLabelTh : heroSite.hotLabelKo;
  const hotFootnoteUi = locale === 'th' ? heroSite.hotFootnoteTh : heroSite.hotFootnoteKo;
  const guestPubLab = locale === 'th' ? heroSite.guestPublicLabelTh : heroSite.guestPublicLabelKo;
  const guestPubBody = locale === 'th' ? heroSite.guestPublicBodyTh : heroSite.guestPublicBodyKo;
  const guestMemLab = locale === 'th' ? heroSite.guestMemberLabelTh : heroSite.guestMemberLabelKo;
  const guestMemBody = locale === 'th' ? heroSite.guestMemberBodyTh : heroSite.guestMemberBodyKo;
  const guestCta = locale === 'th' ? heroSite.guestLoginCtaTh : heroSite.guestLoginCtaKo;
  const dreamIntro = locale === 'th' ? heroSite.dreamIntroTh : heroSite.dreamIntroKo;
  const dreamMinihome = locale === 'th' ? heroSite.dreamMinihomeTh : heroSite.dreamMinihomeKo;
  const dreamMid = locale === 'th' ? heroSite.dreamMidTh : heroSite.dreamMidKo;
  const dreamPersonal = locale === 'th' ? heroSite.dreamPersonalTh : heroSite.dreamPersonalKo;
  const dreamOutro = locale === 'th' ? heroSite.dreamOutroTh : heroSite.dreamOutroKo;
  const tips = useMemo(() => tipEnv(), []);
  const hasTip = Boolean(tips.tg || tips.wa || tips.line || tips.fb || tips.tt);

  const newsLocalized = useMemo(
    () =>
      news.map((item) => {
        if (!item.localeSource) return item;
        const { title, summary_text } = titleAndSummaryFromProcessed(
          item.localeSource.clean_body,
          item.localeSource.raw_title,
          item.localeSource.summaries,
          locale,
        );
        return { ...item, title, summary_text };
      }),
    [news, locale],
  );

  const hotNewsItems = newsLocalized.slice(0, 5);
  const newsShow = newsLocalized.slice(0, 5);

  const portalQuickLinks = useMemo(() => {
    return PORTAL_QUICK_HREFS.map((href) => {
      const e = SITE_SEARCH_ENTRIES.find((x) => x.href === href);
      if (!e) return null;
      const label = locale === 'th' ? e.thTitle : e.koTitle;
      const target =
        href === '/' || href === '/tips' ? href : isLoggedIn ? href : loginNextHref(href);
      return { href: target, label, key: href };
    }).filter((x): x is PortalQuickLink => x !== null);
  }, [isLoggedIn, locale]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), HOME_FETCH_BUDGET_MS));
      const newsP = fetchNewsBrowser();
      const shopsP = isLoggedIn ? fetchFeaturedShopsBrowser() : Promise.resolve([] as LocalBusiness[]);
      const result = await Promise.race([Promise.all([newsP, shopsP]), timeout]);
      if (cancelled) return;
      if (result === 'timeout') {
        setNews([]);
        setShops([]);
      } else {
        const [n, s] = result;
        setNews(n);
        setShops(s);
      }
      setListsBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setWeatherBusy(false);
      setWeatherRows([]);
      setWeatherErr(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setWeatherBusy(true);
      setWeatherErr(false);
      try {
        const loc = locale === 'th' ? 'th' : 'ko';
        const res = await fetch(`/api/weather?locale=${loc}`);
        if (!res.ok) {
          if (!cancelled) {
            setWeatherRows([]);
            setWeatherErr(true);
          }
          return;
        }
        const body = (await res.json()) as {
          cities?: { key: string; temperature_c: number | null; condition: string }[];
        };
        const cities = body.cities ?? [];
        const labelFor = (key: string) => {
          if (key === 'pattaya') return h.weatherPattaya;
          if (key === 'chiang_mai') return h.weatherChiangMai;
          return h.weatherBangkok;
        };
        if (!cancelled) {
          setWeatherRows(
            cities.map((c) => ({
              key: c.key,
              label: labelFor(c.key),
              temp: c.temperature_c,
              condition: c.condition || '—',
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setWeatherRows([]);
          setWeatherErr(true);
        }
      } finally {
        if (!cancelled) setWeatherBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, locale, h.weatherBangkok, h.weatherChiangMai, h.weatherPattaya]);

  return (
    <div className="page-body">
      <section className="home-portal-mast" aria-label={h.portalMastTitle}>
        <h2 className="home-portal-mast__title">{h.portalMastTitle}</h2>
        <p className="home-portal-mast__sub">{h.portalMastSub}</p>
        <div className="home-portal-mast__search">
          <SiteSearch variant="nate" omitIntro />
        </div>
        <nav className="home-portal-mast__quick" aria-label={h.portalMastQuickAria}>
          {portalQuickLinks.map((item) => (
            <Link key={item.key} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__intro">
          <p className="home-hero__tag">{heroTag}</p>
          <p className="home-hero__brand">
            <BrandPhrase variant="light" />
          </p>
          <h1 id="home-hero-title" className="home-hero__title">
            {heroTitle}
          </h1>
          <p className="home-hero__kicker">{heroKicker}</p>
          <p className="home-hero__lead">
            <strong className="home-hero__accent">{heroLeadLine}</strong>
          </p>
          <p className="home-hero__sub">{heroSubBlock}</p>
          {!isLoggedIn ? (
            <div className="home-hero__dream-wrap">
              <p id="home-mini-teaser" className="home-hero__dream">
                {dreamIntro}
                <strong className="home-hero__accent">
                  <Link href={loginNextHref('/minihome')}>{dreamMinihome}</Link>
                </strong>
                {dreamMid}
                <strong className="home-hero__accent">{dreamPersonal}</strong>
                {dreamOutro}
              </p>
            </div>
          ) : null}
        </div>
        <div className="hub-tiles">
          <Link
            href={isLoggedIn ? '/minihome' : loginNextHref('/minihome')}
            className="hub-tile"
          >
            <span className="hub-tile__emoji">🏠</span>
            <span>{h.hubMinihome}</span>
            <span className="hub-tile__sub">{h.hubMinihomeSub}</span>
          </Link>
          <Link
            href={isLoggedIn ? '/community/boards' : loginNextHref('/community/boards')}
            className="hub-tile"
          >
            <span className="hub-tile__emoji">💬</span>
            <span>{h.hubBoard}</span>
            <span className="hub-tile__sub">{h.hubBoardSub}</span>
          </Link>
          <Link href={isLoggedIn ? '/local' : loginNextHref('/local')} className="hub-tile">
            <span className="hub-tile__emoji">🏪</span>
            <span>{h.hubLocal}</span>
            <span className="hub-tile__sub">{h.hubLocalSub}</span>
          </Link>
          <Link
            href={isLoggedIn ? '/community/trade' : loginNextHref('/community/trade')}
            className="hub-tile"
          >
            <span className="hub-tile__emoji">🧺</span>
            <span>{h.hubNotice}</span>
            <span className="hub-tile__sub">{h.hubNoticeSub}</span>
          </Link>
          {hasTip ? (
            <div className="hub-tile" style={{ cursor: 'default' }}>
              <span className="hub-tile__emoji">📬</span>
              <span>{h.hubTip}</span>
              <span className="hub-tile__sub hub-tile__sub--tip-icons">
                <HubTipSocialIcons
                  tips={tips}
                  labels={{
                    tg: h.tipTelegram,
                    wa: h.tipWhatsapp,
                    line: h.tipLine,
                    fb: h.tipFacebook,
                    tt: h.tipTiktok,
                  }}
                />
              </span>
            </div>
          ) : (
            <Link
              href={isLoggedIn ? '/community/boards/new?cat=info' : loginNextHref('/community/boards/new?cat=info')}
              className="hub-tile"
              style={{ opacity: 0.92 }}
            >
              <span className="hub-tile__emoji">📬</span>
              <span>{h.hubTip}</span>
              <span className="hub-tile__sub">{h.hubTipSoon} · 게시판 제보하기</span>
            </Link>
          )}
        </div>
      </section>

      <section className="hot-strip" aria-label={hotLabelUi}>
        <p className="hot-strip__label">{hotLabelUi}</p>
        {listsBusy ? (
          <p className="hot-strip__state">{h.hotNewsLoading}</p>
        ) : hotNewsItems.length === 0 ? (
          <p className="hot-strip__state hot-strip__state--empty">{h.hotNewsEmpty}</p>
        ) : (
          <ul className="hot-strip__list">
            {hotNewsItems.map((item) => {
              const host = extractHostname(item.external_url);
              const date = formatDate(item.published_at);
              const link = item.internalNewsId ? (
                <Link href={`/news/${item.internalNewsId}`} className="hot-strip__link">
                  {item.title}
                </Link>
              ) : (
                <a
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hot-strip__link"
                >
                  {item.title}
                </a>
              );
              const lead = item.summary_text?.trim();
              return (
                <li key={item.id} className="hot-strip__item">
                  <span className="hot-strip__badge">{h.hotNewsBadge}</span>
                  <div className="hot-strip__body">
                    {link}
                    {lead ? <p className="hot-strip__lead">{lead}</p> : null}
                  </div>
                  <span className="hot-strip__meta">{date || host || '—'}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="hot-strip__footnote">{hotFootnoteUi}</p>
      </section>

      {!isLoggedIn ? (
        <div className="guest-home-split card">
          <div className="guest-home-split__grid">
            <div className="guest-home-split__box guest-home-split__box--read">
              <p className="guest-home-split__label">{guestPubLab}</p>
              <p className="guest-home-split__body">{guestPubBody}</p>
            </div>
            <div className="guest-home-split__box guest-home-split__box--member">
              <p className="guest-home-split__label">{guestMemLab}</p>
              <p className="guest-home-split__body">{guestMemBody}</p>
            </div>
          </div>
          <Link
            href={loginNextHref('/')}
            className="board-form__submit guest-home-split__cta"
            style={{ display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}
          >
            {guestCta}
          </Link>
        </div>
      ) : null}

      {isLoggedIn ? (
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <h2 className="section-title">{h.shopsTitle}</h2>
          <Link href="/local" className="section-more">
            {h.shopsMore}
          </Link>
        </div>
        {listsBusy ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--tj-muted)' }}>{h.shopsLoading}</p>
        ) : shops.length > 0 ? (
          <div className="shop-grid">
            {shops.map((shop) => (
              <ShopMiniCard
                key={shop.id}
                shop={shop}
                tierPremium={d.tierPremium}
                tierStandard={d.tierStandard}
              />
            ))}
          </div>
        ) : (
          <div className="card empty-state" style={{ padding: '24px' }}>
            <p>{h.shopsEmpty}</p>
            <Link href="/local" style={{ color: 'var(--tj-link)', fontSize: '0.85rem' }}>
              {h.shopsEmptyLink}
            </Link>
          </div>
        )}
      </section>
      ) : null}

      {isLoggedIn ? (
      <div className="digest-strip">
        <div className="digest-cell digest-cell--weather">
          <p className="digest-cell__title">{h.weatherTitle}</p>
          {weatherBusy ? (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tj-muted)' }}>{h.weatherLoading}</p>
          ) : weatherErr || weatherRows.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tj-muted)' }}>{h.weatherUnavailable}</p>
          ) : (
            <div>
              {weatherRows.map((row) => (
                <div key={row.key} className="digest-weather__row">
                  <span className="digest-weather__city">{row.label}</span>
                  <span className="digest-weather__data">
                    {row.temp !== null ? `${row.temp}°C` : '—'}
                    <br />
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.condition}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '8px 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>{h.weatherAttribution}</p>
        </div>
        <div className="digest-cell digest-cell--compact">
          <p className="digest-cell__title">{h.fxTitle}</p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--tj-muted)', lineHeight: 1.45 }}>
            {h.fxRemote.floatingHint}
          </p>
        </div>
        <div className="digest-cell digest-cell--compact">
          <p className="digest-cell__title">{h.tipDigestTitle}</p>
          {hasTip ? (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {tips.tg && (
                <li style={{ padding: '4px 0' }}>
                  <a href={tips.tg} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                    {h.tipTelegram}
                  </a>
                </li>
              )}
              {tips.wa && (
                <li style={{ padding: '4px 0' }}>
                  <a href={tips.wa} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                    {h.tipWhatsapp}
                  </a>
                </li>
              )}
              {tips.line && (
                <li style={{ padding: '4px 0' }}>
                  <a href={tips.line} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                    {h.tipLine}
                  </a>
                </li>
              )}
              {tips.fb && (
                <li style={{ padding: '4px 0' }}>
                  <a href={tips.fb} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                    {h.tipFacebook}
                  </a>
                </li>
              )}
              {tips.tt && (
                <li style={{ padding: '4px 0' }}>
                  <a href={tips.tt} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tj-link)' }}>
                    {h.tipTiktok}
                  </a>
                </li>
              )}
            </ul>
          ) : (
            null
          )}
        </div>
      </div>
      ) : null}

      {isLoggedIn ? (
      <section className="news-section-muted" aria-labelledby="news-muted-title">
        <div className="section-header">
          <div>
            <h2 id="news-muted-title" className="section-title">
              {h.newsTitle}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>{h.newsSub}</p>
          </div>
        </div>
        {listsBusy ? (
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--tj-muted)' }}>{h.newsLoading}</p>
        ) : newsShow.length > 0 ? (
          <>
            {newsShow.map((item) => (
              <NewsCardCompact key={item.id} item={item} />
            ))}
            {newsLocalized.length > 5 && (
              <p style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8' }}>
                {h.newsCountLine.replace('{n}', String(newsLocalized.length))}
              </p>
            )}
          </>
        ) : (
          <div className="card empty-state" style={{ padding: '20px' }}>
            <p>{h.newsEmpty}</p>
            <Link href="/community/boards" style={{ color: 'var(--tj-link)', fontSize: '0.8rem' }}>
              {h.newsEmptyLink}
            </Link>
          </div>
        )}
      </section>
      ) : null}
    </div>
  );
}
