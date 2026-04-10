'use client';

import Link from 'next/link';
import { RetroBadge } from '@/components/ui/retro-badge';
import { Skeleton } from '@/components/ui/skeleton';

type NewsItem = {
  id: string;
  title: string;
  summary_text: string | null;
  external_url: string;
  published_at: string | null;
  internalNewsId?: string;
};

type Props = {
  items: NewsItem[];
  loading: boolean;
  label: string;
  footnote: string;
  badgeText: string;
  emptyText: string;
  loadingText: string;
  formatDate: (d: string | null) => string;
  extractHostname: (url: string) => string;
};

export function NewsStrip({
  items,
  loading,
  label,
  footnote,
  badgeText,
  emptyText,
  loadingText,
  formatDate,
  extractHostname,
}: Props) {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-6" aria-label={label}>
      <div className="rounded-lg border-2 border-museum-saffron/30 bg-saffron-50/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-saffron-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-museum-saffron" />
          {label}
        </h3>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-tj-muted">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const host = extractHostname(item.external_url);
              const date = formatDate(item.published_at);
              return (
                <li key={item.id} className="flex items-start gap-2">
                  <RetroBadge variant="saffron" size="xs" className="mt-0.5 shrink-0">
                    {badgeText}
                  </RetroBadge>
                  <div className="min-w-0 flex-1">
                    {item.internalNewsId ? (
                      <Link
                        href={`/news/${item.internalNewsId}`}
                        className="text-sm font-semibold text-tj-ink no-underline hover:text-museum-coral hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <a
                        href={item.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-tj-ink no-underline hover:text-museum-coral hover:underline"
                      >
                        {item.title}
                      </a>
                    )}
                    {item.summary_text?.trim() && (
                      <p className="mt-0.5 text-xs leading-relaxed text-tj-muted line-clamp-1">
                        {item.summary_text}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[0.65rem] text-gray-400 tabular-nums">
                    {date || host || '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-3 text-[0.65rem] text-gray-400">{footnote}</p>
      </div>
    </section>
  );
}
