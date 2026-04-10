import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/lib/seo/JsonLd';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';
import { linkHostLabel } from '@/lib/linkWebHost';
import { LINK_BANNERS } from '@/data/linkBanners';
import { LINK_WEB_COPY } from '@/data/linkWebCopy';
import { LINK_WEB_ENTRIES } from '@/data/linkWeb';
import styles from './page.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const base = getAutoSiteBaseUrl();
  const url = base;
  const { title, description } = LINK_WEB_COPY;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: LINK_WEB_COPY.siteName,
      locale: 'ko_KR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
}

export default function HomePage() {
  const pageUrl = getAutoSiteBaseUrl();
  const c = LINK_WEB_COPY;
  const itemListElements = LINK_WEB_ENTRIES.map((item, i) => ({
    '@type': 'ListItem' as const,
    position: i + 1,
    name: item.label,
    url: item.href,
    description: item.hint,
  }));

  return (
    <div className={styles.wrap}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: c.title,
          description: c.description,
          url: pageUrl,
          inLanguage: 'ko',
          isPartOf: {
            '@type': 'WebSite',
            name: c.siteName,
            url: getAutoSiteBaseUrl(),
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: c.title,
          description: c.description,
          numberOfItems: LINK_WEB_ENTRIES.length,
          itemListElement: itemListElements,
        }}
      />
      <div className={styles.inner}>
        <header className={styles.profile}>
          <div className={styles.avatar} aria-hidden>
            <span className={styles.avatarInner}>A</span>
          </div>
          <p className={styles.kicker}>{c.kicker}</p>
          <h1 className={styles.displayName}>{c.displayName}</h1>
          <p className={styles.handle}>{c.handle}</p>
          <p className={styles.lead}>{c.lead}</p>
        </header>

        <section className={styles.bannerStack} aria-label="프로모션 배너">
          {LINK_BANNERS.map((b) =>
            b.variant === 'hero' ? (
              <a
                key={b.id}
                className={styles.bannerHero}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.bannerHeroGlow} aria-hidden />
                <span className={styles.bannerBadge}>{b.badge}</span>
                <span className={styles.bannerHeroTitle}>{b.title}</span>
                <span className={styles.bannerHeroSub}>{b.subtitle}</span>
                <span className={styles.bannerCta}>
                  <span>{b.cta}</span>
                  <span className={styles.bannerCtaArrow} aria-hidden>
                    →
                  </span>
                </span>
              </a>
            ) : (
              <div key={b.id} className={styles.bannerStrip}>
                <span className={styles.bannerStripAccent} aria-hidden />
                <div className={styles.bannerStripText}>
                  <span className={styles.bannerStripTitle}>{b.title}</span>
                  <span className={styles.bannerStripSub}>{b.subtitle}</span>
                </div>
              </div>
            ),
          )}
        </section>

        <nav className={styles.section} aria-labelledby="link-web-heading">
          <h2 id="link-web-heading" className={styles.sectionLabel}>
            {c.sectionLabel}
          </h2>
          <ul className={styles.list}>
            {LINK_WEB_ENTRIES.map((item) => {
              const host = linkHostLabel(item.href);
              return (
                <li key={item.id}>
                  <a
                    className={styles.pill}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.pillMain}>
                      <span className={styles.pillLabel}>{item.label}</span>
                      {host ? (
                        <span className={styles.pillHost} title={item.href}>
                          {host}
                        </span>
                      ) : null}
                      {item.hint ? <span className={styles.pillHint}>{item.hint}</span> : null}
                    </span>
                    <span className={styles.pillArrow} aria-hidden>
                      ↗
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className={styles.foot}>{c.footNote}</p>
        <p className={styles.adminLink}>
          <Link href="/admin/login">운영 콘솔</Link>
        </p>
      </div>
    </div>
  );
}
