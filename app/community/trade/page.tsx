import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { absoluteUrl } from '@/lib/seo/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const b = d.board;
  const title = b.tradeHubTitle;
  const description = d.seo.tradeHubDescription;
  const url = absoluteUrl('/community/trade');
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: d.seo.defaultTitle,
      locale: locale === 'th' ? 'th_TH' : 'ko_KR',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  };
}

export default async function TradeHubPage() {
  const locale = await getLocale();
  const b = getDictionary(locale).board;

  return (
    <div className="page-body board-page">
      <div className="board-toolbar">
        <h1 className="board-title">{b.tradeHubTitle}</h1>
        <Link href="/community/boards" style={{ fontSize: '0.85rem', color: 'var(--tj-link)' }}>
          {b.tradeAllBoards}
        </Link>
      </div>
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55 }}>{b.tradeHubIntro}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Link href="/community/boards?cat=flea" className="board-post" style={{ display: 'block' }}>
          <span className="board-post__title">{b.tradeFleaCta}</span>
        </Link>
        <Link href="/community/boards?cat=job" className="board-post" style={{ display: 'block' }}>
          <span className="board-post__title">{b.tradeJobCta}</span>
        </Link>
      </div>
    </div>
  );
}
