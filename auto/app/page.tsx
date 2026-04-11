import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/lib/seo/JsonLd';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';
import { linkHostLabel } from '@/lib/linkWebHost';
import { LINK_SPOT_TILES } from '@/data/linkBanners';
import { LINK_WEB_COPY } from '@/data/linkWebCopy';
import { LINK_SECTIONS, flattenLinkEntries } from '@/data/linkWeb';
import { BrandLogo } from './BrandLogo';
import { CopyUrlButton } from './CopyUrlButton';
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
  const flat = flattenLinkEntries(LINK_SECTIONS);
  const itemListElements = flat.map((item, i) => ({
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
          numberOfItems: flat.length,
          itemListElement: itemListElements,
        }}
      />

      <div className={styles.bgMesh} aria-hidden />
      <div className={styles.inner}>
        <header className={styles.top}>
          <div className={styles.brandRow}>
            <div className={styles.logoWrap}>
              <BrandLogo />
            </div>
            <div className={styles.brandText}>
              <p className={styles.brandKo}>{c.brandKo}</p>
              <p className={styles.brandEn}>{c.brandEn}</p>
              <p className={styles.brandCredit}>{c.brandCredit}</p>
            </div>
          </div>
          <p className={styles.tagline}>{c.kicker}</p>
        </header>

        <section className={styles.hero} aria-labelledby="hub-url-label">
          <p id="hub-url-label" className={styles.heroEyebrow}>
            {c.heroEyebrow}
          </p>
          <div className={styles.heroCard}>
            <div className={styles.urlLine}>
              <code className={styles.urlCode}>{pageUrl}</code>
              <CopyUrlButton url={pageUrl} className={styles.copyBtn} />
            </div>
            <p className={styles.heroHint}>{c.heroHint}</p>
          </div>
        </section>

        <section className={styles.spotSection} aria-labelledby="spot-label">
          <h2 id="spot-label" className={styles.spotHeading}>
            {c.spotLabel}
          </h2>
          <div className={styles.spotGrid}>
            {LINK_SPOT_TILES.map((s) => (
              <a
                key={s.id}
                className={styles.spotTile}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.spotSub}>{s.sub}</span>
                <span className={styles.spotTitle}>{s.title}</span>
                <span className={styles.spotArrow} aria-hidden>
                  ↗
                </span>
              </a>
            ))}
          </div>
        </section>

        <div className={styles.sectionGrid}>
          {LINK_SECTIONS.map((section) => (
            <section key={section.id} className={styles.cat} aria-labelledby={`cat-${section.id}`}>
              <div className={styles.catHead}>
                <h2 id={`cat-${section.id}`} className={styles.catTitle}>
                  {section.title}
                </h2>
                <span className={styles.catChev} aria-hidden>
                  →
                </span>
              </div>
              <ol className={styles.rankList}>
                {section.items.map((item, idx) => {
                  const rank = idx + 1;
                  const host = linkHostLabel(item.href);
                  const rankClass =
                    rank === 1 ? styles.rank1 : rank === 2 ? styles.rank2 : rank === 3 ? styles.rank3 : styles.rankN;
                  return (
                    <li key={item.id} className={styles.rankItem}>
                      <a
                        className={styles.rankLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className={`${styles.rankBadge} ${rankClass}`} aria-hidden>
                          {rank}
                        </span>
                        <span className={styles.rankBody}>
                          <span className={styles.rankLabel}>{item.label}</span>
                          {host ? (
                            <span className={styles.rankHost} title={item.href}>
                              {host}
                            </span>
                          ) : null}
                          {item.hint ? <span className={styles.rankHint}>{item.hint}</span> : null}
                        </span>
                        <span className={styles.rankGo} aria-hidden>
                          ↗
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        <p className={styles.lead}>{c.lead}</p>

        <footer className={styles.foot}>
          <p className={styles.footNote}>{c.footNote}</p>
          <Link href="/admin/login" className={styles.adminLink}>
            운영 콘솔
          </Link>
        </footer>
      </div>
    </div>
  );
}
