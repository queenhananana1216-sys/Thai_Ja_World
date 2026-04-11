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
type TipPreview = { id: string; title: string; excerpt: string; created_at: string };

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
  const [dotoriBalance, setDotoriBalance] = useState<number | null>(null);
  const [tipsItems, setTipsItems] = useState<TipPreview[]>([]);
  const [popularPosts, setPopularPosts] = useState<{ id: string; title: string; author_name: string; reaction_count: number; comment_count: number }[]>([]);
  const [hotPosts, setHotPosts] = useState<{ id: string; title: string; author_name: string; reaction_count: number; comment_count: number; category: string }[]>([]);
  const [chatPreview, setChatPreview] = useState<{ id: string; body: string; author_name: string }[]>([]);
  const [fxRates, setFxRates] = useState<{ thb_krw: string; usd_thb: string; krw_thb: string } | null>(null);

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

      if (cancelled) return;
      const sb = createBrowserClient();

      // 실DB 연결: 꿀팁, 인기글, 핫글, 채팅, 도토리
      const [tipsRes, popRes, hotRes, chatRes, fxRes] = await Promise.all([
        sb.rpc('get_tips_public', { limit_n: 4 }).then(r => r.data ?? []),
        sb.rpc('get_popular_posts', { limit_n: 5, days_back: 30 }).then(r => r.data ?? []),
        sb.rpc('get_popular_posts', { limit_n: 3, days_back: 7 }).then(r => r.data ?? []),
        sb.rpc('get_chat_preview', { limit_n: 3 }).then(r => r.data ?? []),
        fetch('/api/fx').then(r => r.ok ? r.json() : null).catch(() => null),
      ]);

      if (cancelled) return;
      const liveTips = (tipsRes as TipPreview[]) ?? [];
      setTipsItems(liveTips);
      setPopularPosts((popRes as { id: string; title: string; author_name: string; reaction_count: number; comment_count: number }[]) ?? []);
      setHotPosts((hotRes as { id: string; title: string; author_name: string; reaction_count: number; comment_count: number; category: string }[]) ?? []);
      setChatPreview(((chatRes as { id: string; body: string; author_name: string }[]) ?? []).reverse());

      if (fxRes && typeof fxRes === 'object') {
        const fx = fxRes as { usdToThb?: number; usdToKrw?: number };
        if (typeof fx.usdToThb === 'number' && typeof fx.usdToKrw === 'number') {
          setFxRates({
            thb_krw: (fx.usdToKrw / fx.usdToThb).toFixed(1),
            usd_thb: fx.usdToThb.toFixed(1),
            krw_thb: (fx.usdToThb / fx.usdToKrw).toFixed(4),
          });
        }
      }

      if (isLoggedIn) {
        const { data: { user } } = await sb.auth.getUser();
        if (user && !cancelled) {
          const { data: prof } = await sb.from('profiles').select('style_score_total').eq('id', user.id).maybeSingle();
          if (!cancelled) setDotoriBalance(typeof prof?.style_score_total === 'number' ? prof.style_score_total : null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, locale]);

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
    <div className="fv2">
      {/* ══ PORTAL ZONE ══ */}
      <div className="fv2-portal">
        <div className="fv2-portal__inner">
          {/* ── Main ── */}
          <div className="fv2-portal__main">
            {/* 통합 검색 + 바로가기 — 플랫폼 허브 */}
            <section className="fv2-hub" aria-labelledby="fv2-portal-hub-title">
              <div className="fv2-hub__head">
                <h2 id="fv2-portal-hub-title" className="fv2-hub__title">
                  {h.portalMastTitle}
                </h2>
                {h.portalMastSub ? <p className="fv2-hub__sub">{h.portalMastSub}</p> : null}
              </div>
              <div className="fv2-hub__search">
                <SiteSearch variant="portal" omitIntro />
              </div>
              <nav className="fv2-hub__quick" aria-label={h.portalMastQuickAria}>
                {portalQuickLinks.map((item) => (
                  <Link key={item.key} href={item.href} className="fv2-hub__chip">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </section>

            {/* 속보 / 긴급 */}
            <section className="fv2-card" aria-label={hotLabelUi}>
              <div className="fv2-card__head">
                <h2 className="fv2-card__h">{h.portalMastTitle.includes('검색') ? '속보 / 긴급' : hotLabelUi}</h2>
                <Link href="/news" className="fv2-more">더보기 ›</Link>
              </div>
              {listsBusy ? (
                <p className="fv2-card__state">{h.hotNewsLoading}</p>
              ) : hotNewsItems.length === 0 ? (
                <p className="fv2-card__state">{h.hotNewsEmpty}</p>
              ) : (
                <div className="fv2-news-rows">
                  {hotNewsItems.map((item, idx) => {
                    const date = formatDate(item.published_at);
                    const linkEl = item.internalNewsId ? (
                      <Link href={`/news/${item.internalNewsId}`} className="fv2-news-row__link">
                        {item.title}
                      </Link>
                    ) : (
                      <a href={item.external_url} target="_blank" rel="noopener noreferrer" className="fv2-news-row__link">
                        {item.title}
                      </a>
                    );
                    return (
                      <div key={item.id} className="fv2-news-row">
                        {idx === 0 && <span className="fv2-badge fv2-badge--red">긴급</span>}
                        {idx === 1 && <span className="fv2-badge fv2-badge--blue">HOT</span>}
                        {linkEl}
                        <span className="fv2-news-row__time">{date || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 오늘의 꿀팁 (실DB: get_tips_public) */}
            <section className="fv2-tips">
              <div className="fv2-card__head">
                <h2 className="fv2-card__h">오늘의 꿀팁</h2>
                <Link href="/tips" className="fv2-more">더보기 ›</Link>
              </div>
              {tipsItems.length === 0 && !listsBusy ? (
                <p className="fv2-card__state">꿀팁을 준비 중이에요.</p>
              ) : tipsItems.length === 0 ? (
                <p className="fv2-card__state">{h.hotNewsLoading}</p>
              ) : (
                <div className="fv2-tips__grid">
                  {tipsItems.map((tip) => (
                    <Link key={tip.id} href={`/tips/${tip.id}`} className="fv2-tip-card">
                      <div className="fv2-tip-card__thumb" />
                      <div className="fv2-tip-card__body">
                        <p className="fv2-tip-card__title">{tip.title}</p>
                        <p className="fv2-tip-card__meta">{tip.excerpt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="fv2-portal__side">
            {/* 날씨 */}
            <div className="fv2-widget">
              <p className="fv2-widget__h">🌤️ 날씨</p>
              {weatherBusy ? (
                <p className="fv2-widget__muted">{h.weatherLoading}</p>
              ) : weatherErr || weatherRows.length === 0 ? (
                <p className="fv2-widget__muted">{h.weatherUnavailable}</p>
              ) : (
                weatherRows.map((row) => (
                  <p key={row.key} className="fv2-widget__line">
                    {row.label} {row.temp !== null ? `${row.temp}°C` : '—'} {row.condition}
                  </p>
                ))
              )}
            </div>

            {/* 옥수수 잔액 */}
            {dotoriBalance !== null && (
              <Link href="/minihome/shop" className="fv2-widget fv2-widget--dotori" style={{ textDecoration: 'none', display: 'block' }}>
                <p className="fv2-widget__h">🌽 옥수수</p>
                <p className="fv2-widget__dotori-bal">{dotoriBalance}</p>
                <p className="fv2-widget__muted" style={{ fontSize: '11px' }}>스타일 상점에서 꾸미기 →</p>
              </Link>
            )}

            {/* 환율 (실FX 데이터) */}
            <div className="fv2-widget">
              <p className="fv2-widget__h">💱 환율</p>
              {fxRates ? (
                <>
                  <p className="fv2-widget__line">1 THB = {fxRates.thb_krw} KRW</p>
                  <p className="fv2-widget__line">1 USD = {fxRates.usd_thb} THB</p>
                  <p className="fv2-widget__line">1 KRW = {fxRates.krw_thb} THB</p>
                </>
              ) : (
                <p className="fv2-widget__muted">{h.fxRemote.floatingHint}</p>
              )}
            </div>

            {/* 인기글 TOP 5 (실DB: get_popular_posts) */}
            <div className="fv2-widget">
              <p className="fv2-widget__h">🔥 인기글 TOP 5</p>
              {popularPosts.length === 0 ? (
                <p className="fv2-widget__muted">아직 인기글이 없어요.</p>
              ) : (
                popularPosts.map((p, i) => (
                  <Link key={p.id} href={`/community/boards/${p.id}`} className="fv2-widget__line" style={{ display: 'block', textDecoration: 'none', color: '#374151' }}>
                    {i + 1}. {p.title}
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ══ COMMUNITY ZONE ══ */}
      <div className="fv2-community">
        <div className="fv2-community__inner">
          <div className="fv2-community__main">
            {/* 커뮤니티 핫글 (실DB: get_popular_posts 7일) */}
            <section>
              <div className="fv2-card__head">
                <h2 className="fv2-card__h">커뮤니티 핫글</h2>
                <Link href={isLoggedIn ? '/community/boards' : loginNextHref('/community/boards')} className="fv2-more">더보기 ›</Link>
              </div>
              {hotPosts.length === 0 ? (
                <p className="fv2-card__state">아직 핫글이 없어요. 첫 글을 남겨보세요!</p>
              ) : (
                <div className="fv2-board-cards">
                  {hotPosts.map((p, i) => {
                    const colors = ['fv2-board-card--yellow', 'fv2-board-card--purple', 'fv2-board-card--green'];
                    return (
                      <Link key={p.id} href={`/community/boards/${p.id}`} className={`fv2-board-card ${colors[i % 3]}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="fv2-board-card__author"><span className="fv2-avatar" /> {p.author_name}</div>
                        <p className="fv2-board-card__text">{p.title}</p>
                        <div className="fv2-board-card__react">
                          <span className="fv2-react--heart">❤️ {p.reaction_count}</span>
                          <span className="fv2-react--chat">💬 {p.comment_count}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 우리 동네 가게 */}
            <section>
              <div className="fv2-card__head">
                <h2 className="fv2-card__h">우리 동네 가게</h2>
                <Link href={isLoggedIn ? '/local' : loginNextHref('/local')} className="fv2-more">더보기 ›</Link>
              </div>
              {listsBusy ? (
                <p className="fv2-card__state">{h.shopsLoading}</p>
              ) : shops.length > 0 ? (
                <div className="fv2-shop-scroll">
                  {shops.map((shop) => (
                    <Link href={`/local/${shop.slug}`} key={shop.id} className="fv2-shop-card">
                      <div
                        className="fv2-shop-card__img"
                        style={shop.image_url ? { backgroundImage: `url(${shop.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                      >
                        {!shop.image_url && <span>{shop.emoji}</span>}
                      </div>
                      <div className="fv2-shop-card__info">
                        <p className="fv2-shop-card__name">{shop.name}</p>
                        <p className="fv2-shop-card__rating">⭐ {shop.tier === 'premium' ? '4.8' : shop.tier === 'standard' ? '4.5' : '4.2'}</p>
                        <p className="fv2-shop-card__desc">{shop.description?.slice(0, 20) || `${shop.category} · ${shop.region}`}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="fv2-card__state">{h.shopsEmpty}</p>
              )}
            </section>
          </div>

          {/* Community Sidebar: 실시간 채팅 */}
          {/* 실시간 채팅 (실DB: get_chat_preview) */}
          <aside className="fv2-community__side">
            <div className="fv2-chat-preview">
              <p className="fv2-widget__h">💬 실시간 채팅</p>
              {chatPreview.length === 0 ? (
                <p className="fv2-chat-preview__msg" style={{ color: '#9ca3af' }}>아직 채팅이 없어요.</p>
              ) : (
                chatPreview.map((msg) => (
                  <p key={msg.id} className="fv2-chat-preview__msg">
                    <strong>{msg.author_name}</strong>: {msg.body.length > 40 ? msg.body.slice(0, 40) + '...' : msg.body}
                  </p>
                ))
              )}
              <Link href={isLoggedIn ? '/chat' : loginNextHref('/chat')} className="fv2-chat-preview__btn">
                채팅 참여하기
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
