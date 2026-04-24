import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';
import { fetchPublicSafetyContacts } from '@/lib/safety/fetchPublicSafetyContacts';
import { absoluteUrl, trimForMetaDescription } from '@/lib/seo/site';

function telHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const d = getDictionary(await getLocale());
  const e = d.emergency;
  return {
    title: e.pageTitle,
    description: trimForMetaDescription(e.pageDescription),
    alternates: { canonical: absoluteUrl('/help/emergency') },
    robots: { index: true, follow: true },
  };
}

export default async function EmergencyHelpPage() {
  const locale = await getLocale().catch(() => 'ko' as const);
  const d = getDictionary(locale);
  const e = d.emergency;
  const items = await fetchPublicSafetyContacts(locale, 40);
  const leadSegs = e.lead;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10" style={{ color: 'var(--tj-ink, #1a1523)' }}>
      <h1 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-brand)' }}>
        {e.pageTitle}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {leadSegs.map((s, i) => (i % 2 === 1 ? <strong key={i}>{s}</strong> : <span key={i}>{s}</span>))}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.notPolice}</p>

      <ol className="mt-8 list-decimal space-y-3 pl-5 text-sm" style={{ listStyle: 'decimal' }}>
        {items.length === 0 ? <li className="text-muted-foreground">{e.dataUnavailable}</li> : null}
        {items.map((c) => (
          <li key={c.id} className="pl-1">
            <div className="font-semibold">{c.label}</div>
            {c.valueKind === 'phone' ? (
              <a href={telHref(c.value)} className="text-primary underline">
                {c.value}
              </a>
            ) : c.valueKind === 'url' ? (
              <a href={c.value} className="text-primary underline" target="_blank" rel="noopener noreferrer">
                {c.value}
              </a>
            ) : c.kind === 'report' ? (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <Link className="text-primary underline" href="/community/boards?cat=info" prefetch={false}>
                  {locale === 'th' ? 'กระดานข้อมูล (광장)' : '광장 · 정보'}
                </Link>
                <Link className="text-primary underline" href="/contact" prefetch={false}>
                  {locale === 'th' ? 'ติดต่อทีม' : '운영 문의(/contact)'}
                </Link>
                <span className="text-muted-foreground">— {c.value}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{c.value}</span>
            )}
            {c.sourceUrl ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {locale === 'th' ? 'แหล่งอ้างอิง' : '출처'}:{' '}
                <a className="underline" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {c.sourceUrl}
                </a>
              </div>
            ) : null}
            {c.sourceNote && c.kind !== 'report' ? (
              <p className="mt-1 text-xs text-muted-foreground">{c.sourceNote}</p>
            ) : null}
            {c.sourceNote && c.kind === 'report' ? <p className="mt-1 text-xs text-muted-foreground">{c.sourceNote}</p> : null}
            {c.href && c.kind !== 'report' ? (
              <div className="mt-1 text-xs">
                <Link className="underline" href={c.href} prefetch={false}>
                  {c.href}
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-8">
        <Link className="text-sm font-medium text-primary underline" href="/" prefetch={false}>
          {e.backHome}
        </Link>
      </p>
    </main>
  );
}
