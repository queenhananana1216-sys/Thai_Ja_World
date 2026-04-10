import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/lib/seo/JsonLd';
import { getAutoSiteBaseUrl } from '@/lib/siteUrl';
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
        <header className={styles.head}>
          <div className={styles.kickerWrap}>
            <span className={styles.kickerLine} aria-hidden />
            <p className={styles.kicker}>{c.kicker}</p>
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleAccent}>링크</span> 웹
          </h1>
          <p className={styles.lead}>{c.lead}</p>
        </header>
        <nav className={styles.section} aria-labelledby="link-web-heading">
          <h2 id="link-web-heading" className={styles.sectionLabel}>
            {c.sectionLabel}
          </h2>
          <ul className={styles.list}>
            {LINK_WEB_ENTRIES.map((item, i) => (
              <li key={item.id}>
                <a
                  className={styles.card}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={styles.cardIndex} aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardLabel}>{item.label}</span>
                    {item.hint ? <span className={styles.cardHint}>{item.hint}</span> : null}
                  </span>
                  <span className={styles.cardArrow} aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
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
