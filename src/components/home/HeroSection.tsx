'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle: string;
  tag: string;
  kicker: string;
  leadLine: string;
  subBlock: string;
  quickLinks: { href: string; label: string; key: string }[];
  isLoggedIn: boolean;
  dreamBlock?: React.ReactNode;
  searchSlot?: React.ReactNode;
};

export function HeroSection({
  title,
  subtitle,
  tag,
  kicker,
  leadLine,
  subBlock,
  quickLinks,
  isLoggedIn,
  dreamBlock,
  searchSlot,
}: Props) {
  return (
    <section className="relative overflow-hidden py-8 sm:py-12" aria-label={title}>
      <div className="mx-auto max-w-[1280px] px-4">
        {/* Portal mast */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-tj-ink sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-tj-muted">{subtitle}</p>
          {searchSlot && <div className="mx-auto mt-5 max-w-xl">{searchSlot}</div>}
          <nav className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {quickLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-full border border-tj-line/20 bg-tj-surface px-3 py-1 text-xs font-medium text-tj-muted no-underline shadow-sm transition-all hover:border-museum-coral hover:text-museum-coral hover:shadow-retro-coral hover:no-underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Hero content */}
        <div className="rounded-xl border-2 border-tj-line bg-tj-surface p-6 shadow-retro sm:p-8">
          <div className="max-w-2xl">
            <span className="mb-2 inline-block rounded-sm border border-museum-saffron/40 bg-saffron-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-saffron-700">
              {tag}
            </span>
            <p className="mt-2 inline-flex items-baseline gap-1 text-lg font-extrabold tracking-tight">
              <span className="text-brand-tai">태</span>
              <span className="text-tj-ink">국에 살</span>
              <span className="text-brand-ja">자</span>
            </p>
            <h1 className="mt-3 text-xl font-extrabold leading-tight text-tj-ink sm:text-2xl">
              {title}
            </h1>
            <p className="mt-2 text-sm font-medium text-tj-muted">{kicker}</p>
            <p className="mt-3 text-sm leading-relaxed text-tj-ink">
              <strong className="font-bold text-museum-coral">{leadLine}</strong>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-tj-muted">{subBlock}</p>
            {!isLoggedIn && dreamBlock && <div className="mt-4">{dreamBlock}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
