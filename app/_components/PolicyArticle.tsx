import Link from 'next/link';
import type { Dictionary } from '@/i18n/dictionaries';

export type PolicySlug = 'terms' | 'privacy' | 'contact' | 'ads';

export function policyCopy(
  d: Dictionary,
  slug: PolicySlug,
): { title: string; body: string } {
  const { policy: p } = d;
  switch (slug) {
    case 'terms':
      return { title: p.termsTitle, body: p.termsBody };
    case 'privacy':
      return { title: p.privacyTitle, body: p.privacyBody };
    case 'contact':
      return { title: p.contactTitle, body: p.contactBody };
    case 'ads':
      return { title: p.adsTitle, body: p.adsBody };
  }
}

export function PolicyArticle({ d, slug }: { d: Dictionary; slug: PolicySlug }) {
  const { title, body } = policyCopy(d, slug);
  const paragraphs = body.split('\n\n').filter(Boolean);
  return (
    <main className="site-container page-body policy-page">
      <p className="policy-page__crumb">
        <Link href="/">{d.nav.home}</Link>
      </p>
      <h1 className="policy-page__h1">{title}</h1>
      {paragraphs.map((p, i) => (
        <p key={i} className="policy-page__p">
          {p}
        </p>
      ))}
    </main>
  );
}
