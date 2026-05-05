import type { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocale } from '@/i18n/get-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = await getDictionary(locale);
  return {
    title: locale === 'th' ? 'ค้นหา' : '검색',
    description: d.search.placeholder,
  };
}

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SiteSearchPage({ searchParams }: PageProps) {
  const locale = await getLocale();
  const d = await getDictionary(locale);
  const sp = await searchParams;
  const raw = sp.q;
  const q = typeof raw === 'string' ? raw.trim() : '';

  return (
    <div className="site-container py-8">
      <h1 className="mb-4 text-xl font-bold text-white">{d.search.ariaLabel}</h1>
      <form action="/search" method="GET" className="mb-8 max-w-xl">
        <label className="sr-only" htmlFor="tj-search-page-q">
          {d.search.placeholder}
        </label>
        <input
          id="tj-search-page-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={d.search.placeholder}
          className="w-full rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
        />
      </form>
      {q ? (
        <p className="text-slate-300">
          {locale === 'th' ? 'คำค้น: ' : '검색어: '}
          <span className="font-semibold text-amber-200">{q}</span>
        </p>
      ) : (
        <p className="text-slate-500">{d.search.placeholder}</p>
      )}
      <p className="mt-6">
        <Link href="/" className="text-violet-300 no-underline hover:underline">
          {locale === 'th' ? 'กลับหน้าแรก' : '홈으로'}
        </Link>
      </p>
    </div>
  );
}
