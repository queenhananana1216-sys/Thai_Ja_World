import type { Metadata } from 'next';
import Portal2026View from './portal/Portal2026View';
import {
  fetchPortalHomeFeed,
  HONEST_EMPTY_PORTAL_HOME_FEED,
  type PortalHomeFeed,
} from './lib/home/fetchPortalHomeFeed';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { absoluteUrl } from '@/lib/seo/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const title = dict.nav.home;
  const description = dict.home.tag;
  const url = absoluteUrl('/');
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: dict.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
    },
  };
}

async function loadPortalFeed(): Promise<PortalHomeFeed> {
  try {
    const loaded = await fetchPortalHomeFeed();
    if (loaded && typeof loaded === 'object') {
      return loaded;
    }
  } catch {
    /* fall through */
  }
  return HONEST_EMPTY_PORTAL_HOME_FEED;
}

export default async function HomePage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const feed = await loadPortalFeed();

  return <Portal2026View feed={feed} dict={dict} locale={locale} />;
}
